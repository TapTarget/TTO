import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { MDCButtonReact } from "@orchest/lib-mdc";
import React from "react";

const ImportSuccessDialog: React.FC<{
  open: boolean;
  projectName: string;
  goToPipelines: () => void;
  onClose: () => void;
}> = ({ open, projectName, goToPipelines, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Import complete</DialogTitle>
      <DialogContent>
        <div className="project-import-modal">
          <p className="push-down">
            You have imported <span className="bold">{projectName}</span>{" "}
            successfully! It is now visible in your project list.
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <MDCButtonReact
          classNames={["push-right"]}
          label="Continue browsing"
          onClick={onClose}
        />
        <MDCButtonReact
          label="View pipelines"
          classNames={["mdc-button--raised", "themed-secondary"]}
          onClick={goToPipelines}
        />
      </DialogActions>
    </Dialog>
  );
};

export { ImportSuccessDialog };
