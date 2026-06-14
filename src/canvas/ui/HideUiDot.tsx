import { Panel } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { uiVisibilityAtom } from "../../state";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import "./HideUiDot.css";

export const HideUiDot = () => {
  const setUiVisible = useSetAtom(uiVisibilityAtom);
  return (
    <Panel position='bottom-right'>
      <Tooltip label='Show UI (⌘.)'>
        <button
          type='button'
          className='hide-ui-dot'
          aria-label='Show UI'
          onClick={() => setUiVisible(true)}
        />
      </Tooltip>
    </Panel>
  );
};
