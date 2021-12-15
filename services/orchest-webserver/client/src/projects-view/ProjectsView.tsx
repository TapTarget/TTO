import {
  DataTable,
  DataTableColumn,
  DataTableRow,
} from "@/components/DataTable";
import { Layout } from "@/components/Layout";
import { useAppContext } from "@/contexts/AppContext";
import { useProjectsContext } from "@/contexts/ProjectsContext";
import { useCustomRoute } from "@/hooks/useCustomRoute";
import { useImportUrl } from "@/hooks/useImportUrl";
import { useMounted } from "@/hooks/useMounted";
import { useSendAnalyticEvent } from "@/hooks/useSendAnalyticEvent";
import { siteMap } from "@/Routes";
import type { Project } from "@/types";
import { BackgroundTask } from "@/utils/webserver-utils";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import { MDCButtonReact, MDCTextFieldReact } from "@orchest/lib-mdc";
import { fetcher, makeRequest } from "@orchest/lib-utils";
import React from "react";
import useSWR from "swr";
import { ImportDialog } from "./ImportDialog";

type ProjectRow = Pick<
  Project,
  | "path"
  | "pipeline_count"
  | "session_count"
  | "job_count"
  | "environment_count"
> & {
  settings: string;
};

const columns: DataTableColumn<ProjectRow>[] = [
  { id: "path", label: "Project" },
  { id: "pipeline_count", label: "Pipelines" },
  { id: "session_count", label: "Active sessions" },
  { id: "job_count", label: "Jobs" },
  { id: "environment_count", label: "Environments" },
  { id: "settings", label: "Settings" },
];

const ProjectsView: React.FC = () => {
  const { setAlert, setConfirm } = useAppContext();
  useSendAnalyticEvent("view load", { name: siteMap.projects.path });

  const {
    dispatch,
    state: { projectUuid },
  } = useProjectsContext();
  const { navigateTo } = useCustomRoute();

  const [projectName, setProjectName] = React.useState<string>();
  const [isShowingCreateModal, setIsShowingCreateModal] = React.useState(false);

  const [isImporting, setIsImporting] = React.useState(false);

  const [state, setState] = React.useState({
    isDeleting: false,
    projects: null,
    importResult: undefined,
    fetchListAndSetProject: "",
    editProjectPathModal: false,
    editProjectPathModalBusy: false,
    editProjectPathUUID: undefined,
    editProjectPath: undefined,
  });

  const onEditProjectName = (projectUUID, projectPath) => {
    setState((prevState) => ({
      ...prevState,
      editProjectPathUUID: projectUUID,
      editProjectPath: projectPath,
      editProjectPathModal: true,
    }));
  };

  const onCloseEditProjectPathModal = () => {
    setState((prevState) => ({
      ...prevState,
      editProjectPathModal: false,
      editProjectPathModalBusy: false,
    }));
  };

  const onSubmitEditProjectPathModal = () => {
    if (!validateProjectNameAndAlert(state.editProjectPath)) {
      return;
    }

    setState((prevState) => ({
      ...prevState,
      editProjectPathModalBusy: true,
    }));

    makeRequest("PUT", `/async/projects/${state.editProjectPathUUID}`, {
      type: "json",
      content: {
        name: state.editProjectPath,
      },
    })
      .then((_) => {
        fetchProjects();
      })
      .catch((e) => {
        try {
          let resp = JSON.parse(e.body);

          if (resp.code == 0) {
            setAlert(
              "Error",
              "Cannot rename project when an interactive session is running."
            );
          } else if (resp.code == 1) {
            setAlert(
              "Error",
              `Cannot rename project, a project with the name "${state.editProjectPath}" already exists.`
            );
          }
        } catch (error) {
          console.error(e);
          console.error(error);
        }
      })
      .finally(() => {
        onCloseEditProjectPathModal();
      });
  };

  // const processListData = (projects: Project[]) => {
  //   return projects.map((project) => [
  //     <span key="toggle-row" className="mdc-icon-table-wrapper">
  //       {project.path}{" "}
  //       <span className="consume-click">
  //         <IconButton
  //           onClick={() => {
  //             onEditProjectName(project.uuid, project.path);
  //           }}
  //         >
  //           <EditIcon />
  //         </IconButton>
  //       </span>
  //     </span>,
  //     <span key="pipeline-count">{project.pipeline_count}</span>,
  //     <span key="session-count">{project.session_count}</span>,
  //     <span key="job-count">{project.job_count}</span>,
  //     <span key="env-count">{project.environment_count}</span>,
  //     <span key="setting" className="consume-click">
  //       <IconButton
  //         title="settings"
  //         onClick={() => openSettings(project)}
  //         data-test-id={`settings-button-${project.path}`}
  //       >
  //         <SettingsIcon />
  //       </IconButton>
  //     </span>,
  //   ]);
  // };

  const {
    data: projects = [],
    revalidate: fetchProjects,
    error: fetchProjectsError,
    isValidating,
  } = useSWR<Project[]>(
    "/async/projects?session_counts=true&job_counts=true",
    fetcher
  );

  const mounted = useMounted();

  React.useEffect(() => {
    if (mounted && fetchProjectsError)
      setAlert("Error", "Error fetching projects");
  }, [fetchProjectsError]);

  React.useEffect(() => {
    if (mounted && !isValidating && !fetchProjectsError && projects) {
      dispatch({
        type: "projectsSet",
        payload: projects,
      });
    }
  }, [projects]);

  const projectRows: DataTableRow<ProjectRow>[] = React.useMemo(() => {
    return projects.map((project) => {
      return {
        ...project,
        settings: project.path,
      };
    });
  }, [projects]);

  const openSettings = (project: Project) => {
    navigateTo(siteMap.projectSettings.path, {
      query: { projectUuid: project.uuid },
    });
  };

  const onRowClick = (projectUuid: string) => {
    navigateTo(siteMap.pipelines.path, {
      query: { projectUuid },
    });
  };

  const deleteSelectedRows = async (projectUuids: string[]) => {
    if (!state.isDeleting) {
      setState((prevState) => ({
        ...prevState,
        isDeleting: true,
      }));

      if (projectUuids.length === 0) {
        setAlert("Error", "You haven't selected a project.");

        setState((prevState) => ({
          ...prevState,
          isDeleting: false,
        }));

        return false;
      }

      return setConfirm(
        "Warning",
        "Are you certain that you want to delete these projects? This will kill all associated resources and also delete all corresponding jobs. (This cannot be undone.)",
        async () => {
          // Start actual delete

          try {
            await Promise.all(
              projectUuids.map((projectUuid) =>
                deleteProjectRequest(projectUuid)
              )
            );
            fetchProjects();
            // Clear isDeleting
            setState((prevState) => ({
              ...prevState,
              isDeleting: false,
            }));
            return true;
          } catch (error) {
            return false;
          }
        },
        async () => {
          setState((prevState) => ({
            ...prevState,
            isDeleting: false,
          }));
          return false;
        }
      );
    } else {
      console.error("Delete UI in progress.");
      return false;
    }
  };

  const deleteProjectRequest = (toBeDeletedId: string) => {
    if (projectUuid === toBeDeletedId) {
      dispatch({
        type: "projectSet",
        payload: undefined,
      });
    }

    let deletePromise = makeRequest("DELETE", "/async/projects", {
      type: "json",
      content: {
        project_uuid: toBeDeletedId,
      },
    });

    deletePromise.catch((response) => {
      try {
        let data = JSON.parse(response.body);

        setAlert("Error", `Could not delete project. ${data.message}`);
      } catch {
        setAlert("Error", "Could not delete project. Reason unknown.");
      }
    });

    return deletePromise;
  };

  const onCreateClick = () => {
    setIsShowingCreateModal(true);
  };

  const goToExamples = () => {
    navigateTo(siteMap.examples.path);
  };

  const onClickCreateProject = () => {
    if (!validateProjectNameAndAlert(projectName)) {
      return;
    }

    makeRequest("POST", "/async/projects", {
      type: "json",
      content: {
        name: projectName,
      },
    })
      .then((_) => {
        // reload list once creation succeeds
        // fetchList(projectName);
        fetchProjects();
      })
      .catch((response) => {
        try {
          let data = JSON.parse(response.body);

          setAlert("Error", `Could not create project. ${data.message}`);
        } catch {
          setAlert("Error", "Could not create project. Reason unknown.");
        }
      })
      .finally(() => {
        setProjectName("");
      });

    setIsShowingCreateModal(false);
  };

  const validProjectName = (projectName) => {
    if (projectName === undefined || projectName.length == 0) {
      return {
        valid: false,
        reason: "Project name cannot be empty.",
      };
    } else if (projectName.match("[^A-Za-z0-9_.-]")) {
      return {
        valid: false,
        reason:
          "A project name has to be a valid git repository name and" +
          " thus can only contain alphabetic characters, numbers and" +
          " the special characters: '_.-'. The regex would be" +
          " [A-Za-z0-9_.-].",
      };
    }
    return { valid: true };
  };

  const validateProjectNameAndAlert = (projectName) => {
    let projectNameValidation = validProjectName(projectName);
    if (!projectNameValidation.valid) {
      setAlert(
        "Error",
        `Please make sure you enter a valid project name. ${projectNameValidation.reason}`
      );
    }
    return projectNameValidation.valid;
  };

  const onCloseCreateProjectModal = () => {
    setIsShowingCreateModal(false);
  };

  const onImport = () => {
    setIsImporting(true);
  };

  const onImportComplete = (result: BackgroundTask) => {
    if (result.status === "SUCCESS") {
      fetchProjects();
    }
  };

  React.useEffect(() => {
    if (state.fetchListAndSetProject && state.fetchListAndSetProject !== "") {
      const createdProject = state.projects.filter((proj) => {
        return proj.path == state.fetchListAndSetProject;
      })[0];

      // Needed to avoid a race condition where the project does not
      // exist anymore because it has been removed between a POST and a
      // get request.
      if (createdProject !== undefined) {
        dispatch({
          type: "projectSet",
          payload: createdProject.uuid,
        });
      }
    }
  }, [state?.fetchListAndSetProject]);

  const [importUrl, setImportUrl] = useImportUrl();
  // if user loads the app with a pre-filled import_url in their query string
  // we prompt them directly with the import modal
  React.useEffect(() => {
    if (importUrl !== "") setIsImporting(true);
  }, []);

  return (
    <Layout>
      <div className={"view-page projects-view"}>
        <ImportDialog
          projectName={projectName}
          setProjectName={setProjectName}
          onImportComplete={onImportComplete}
          importUrl={importUrl}
          setImportUrl={setImportUrl}
          open={isImporting}
          onClose={() => setIsImporting(false)}
        />

        <Dialog
          open={state.editProjectPathModal}
          onClose={onCloseEditProjectPathModal}
        >
          <DialogTitle>Edit project name</DialogTitle>
          <DialogContent>
            <MDCTextFieldReact
              classNames={["fullwidth push-down"]}
              value={state.editProjectPath}
              label="Project name"
              onChange={(value) => {
                setState((prevState) => ({
                  ...prevState,
                  editProjectPath: value,
                }));
              }}
            />
          </DialogContent>
          <DialogActions>
            <MDCButtonReact
              icon="close"
              label="Cancel"
              classNames={["push-right"]}
              onClick={onCloseEditProjectPathModal}
            />
            <MDCButtonReact
              icon="save"
              disabled={state.editProjectPathModalBusy}
              classNames={["mdc-button--raised", "themed-secondary"]}
              label="Save"
              submitButton
              onClick={onSubmitEditProjectPathModal}
            />
          </DialogActions>
        </Dialog>
        <Dialog open={isShowingCreateModal} onClose={onCloseCreateProjectModal}>
          <DialogTitle>Create a new project</DialogTitle>
          <DialogContent>
            <MDCTextFieldReact
              classNames={["fullwidth"]}
              label="Project name"
              value={projectName}
              onChange={setProjectName}
              data-test-id="project-name-textfield"
            />
          </DialogContent>
          <DialogActions>
            <MDCButtonReact
              icon="close"
              label="Cancel"
              classNames={["push-right"]}
              onClick={onCloseCreateProjectModal}
            />
            <MDCButtonReact
              icon="format_list_bulleted"
              classNames={["mdc-button--raised", "themed-secondary"]}
              label="Create project"
              submitButton
              onClick={onClickCreateProject}
              data-test-id="create-project"
            />
          </DialogActions>
        </Dialog>

        <h2>Projects</h2>
        {projectRows.length === 0 && isValidating ? (
          <LinearProgress />
        ) : (
          <>
            <div className="push-down">
              <MDCButtonReact
                classNames={[
                  "mdc-button--raised",
                  "themed-secondary",
                  "push-right",
                ]}
                icon="add"
                label="Add project"
                onClick={onCreateClick}
                data-test-id="add-project"
              />
              <MDCButtonReact
                classNames={["mdc-button--raised", "push-right"]}
                icon="input"
                label="Import project"
                onClick={onImport}
                data-test-id="import-project"
              />
              <MDCButtonReact
                classNames={["mdc-button--raised"]}
                icon="lightbulb"
                label="Explore Examples"
                onClick={goToExamples}
                data-test-id="explore-examples"
              />
            </div>
            <DataTable<ProjectRow>
              id="project-list"
              selectable
              hideSearch
              onRowClick={onRowClick}
              deleteSelectedRows={deleteSelectedRows}
              columns={columns}
              rows={projectRows}
              data-test-id="projects-table"
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default ProjectsView;
