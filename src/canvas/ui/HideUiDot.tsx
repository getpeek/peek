import { Panel } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { uiVisibilityAtom } from "../../state";
import "./HideUiDot.css";

export const HideUiDot = () => {
  const setUiVisible = useSetAtom(uiVisibilityAtom);
  return (
    <Panel position='bottom-right'>
      <button
        type='button'
        className='hide-ui-dot'
        aria-label='Show UI'
        title='Show UI (⌘.)'
        onClick={() => setUiVisible(true)}
      />
    </Panel>
  );
};
