import { useCustomRoute } from "@/hooks/useCustomRoute";
import {
  Environment,
  IOrchestSession,
  MouseTracker,
  NewConnection,
  PipelineJson,
  StepsDict,
} from "@/types";
import React from "react";
import { MutatorCallback } from "swr";
import { useAutoStartSession } from "../hooks/useAutoStartSession";
import {
  EventVars,
  EventVarsAction,
  useEventVars,
} from "../hooks/useEventVars";
import { useFetchInteractiveRun } from "../hooks/useFetchInteractiveRun";
import { useInitializePipelineEditor } from "../hooks/useInitializePipelineEditor";
import { useIsReadOnly } from "../hooks/useIsReadOnly";
import { PipelineViewState } from "../hooks/usePipelineViewState";
import { SocketIO, useSocketIO } from "../hooks/useSocketIO";

export type PipelineEditorContextType = {
  eventVars: EventVars;
  dispatch: (value: EventVarsAction) => void;
  stepDomRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  newConnection: React.MutableRefObject<NewConnection>;
  keysDown: Set<number | string>;
  trackMouseMovement: (clientX: number, clientY: number) => void;
  mouseTracker: React.MutableRefObject<MouseTracker>;
  metadataPositions: React.MutableRefObject<Record<string, [number, number]>>;
  pipelineCwd: string;
  pipelineJson: PipelineJson;
  environments: Environment[];
  setPipelineJson: (
    data?: PipelineJson | Promise<PipelineJson> | MutatorCallback<PipelineJson>,
    flushPage?: boolean
  ) => void;
  hash: React.MutableRefObject<string>;
  fetchDataError: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  runUuid: string | undefined;
  setRunUuid: (
    data?: string | Promise<string> | MutatorCallback<string>
  ) => Promise<string>;
  zIndexMax: React.MutableRefObject<number>;
  isReadOnly: boolean;
  instantiateConnection: (
    startNodeUUID: string,
    endNodeUUID?: string | undefined
  ) => {
    startNodeUUID: string;
    endNodeUUID: string;
  };
  sio: SocketIO;
  jobUuid: string;
  projectUuid: string;
  session: IOrchestSession;
  pipelineViewState: PipelineViewState;
  setPipelineViewState: React.Dispatch<
    | Partial<PipelineViewState>
    | ((current: PipelineViewState) => Partial<PipelineViewState>)
  >;
};

export const PipelineEditorContext = React.createContext<
  PipelineEditorContextType
>(null);

export const usePipelineEditorContext = () =>
  React.useContext(PipelineEditorContext);

export const PipelineEditorContextProvider: React.FC = ({ children }) => {
  const {
    projectUuid,
    pipelineUuid,
    jobUuid,
    runUuid: runUuidFromRoute,
    isReadOnly: isReadOnlyFromQueryString,
  } = useCustomRoute();

  const {
    eventVars,
    dispatch,
    stepDomRefs,
    newConnection,
    keysDown,
    trackMouseMovement,
    mouseTracker,
    metadataPositions,
    pipelineViewState,
    setPipelineViewState,
  } = useEventVars();

  const instantiateConnection = React.useCallback(
    (startNodeUUID: string, endNodeUUID?: string | undefined) => {
      const connection = { startNodeUUID, endNodeUUID };

      dispatch({
        type: "INSTANTIATE_CONNECTION",
        payload: connection,
      });

      return connection;
    },
    [dispatch]
  );

  // calculate z-index max when initializing steps and connections.
  // zIndexMax is the initial total count of all steps and connections
  const zIndexMax = React.useRef<number>(0);
  // this is only called once when pipelineJson is loaded in the beginning
  const initializeEventVars = React.useCallback(
    (initialSteps: StepsDict) => {
      dispatch({ type: "SET_STEPS", payload: initialSteps });
      zIndexMax.current = Object.keys(initialSteps).length;
      Object.values(initialSteps).forEach((step) => {
        step.incoming_connections.forEach((startNodeUUID) => {
          let endNodeUUID = step.uuid;

          instantiateConnection(startNodeUUID, endNodeUUID);

          zIndexMax.current += 1;
        });
      });
      dispatch({ type: "SET_INITIALIZED" });
    },
    [dispatch, instantiateConnection]
  );

  const { runUuid, setRunUuid } = useFetchInteractiveRun(
    projectUuid,
    pipelineUuid,
    runUuidFromRoute
  );

  const isReadOnly = useIsReadOnly(
    projectUuid,
    jobUuid,
    runUuid,
    isReadOnlyFromQueryString
  );

  const {
    pipelineCwd,
    pipelineJson,
    environments,
    setPipelineJson,
    hash,
    error: fetchDataError,
  } = useInitializePipelineEditor(
    pipelineUuid,
    projectUuid,
    jobUuid,
    runUuid,
    isReadOnly,
    initializeEventVars
  );

  const sio = useSocketIO();

  const session = useAutoStartSession({
    projectUuid,
    pipelineUuid,
    isReadOnly,
  });

  return (
    <PipelineEditorContext.Provider
      value={{
        projectUuid,
        eventVars,
        dispatch,
        stepDomRefs,
        newConnection,
        keysDown,
        trackMouseMovement,
        mouseTracker,
        metadataPositions,
        pipelineCwd,
        pipelineJson,
        environments,
        setPipelineJson,
        hash,
        fetchDataError,
        runUuid,
        setRunUuid,
        zIndexMax,
        isReadOnly,
        instantiateConnection,
        jobUuid,
        sio,
        session,
        pipelineViewState,
        setPipelineViewState,
      }}
    >
      {children}
    </PipelineEditorContext.Provider>
  );
};
