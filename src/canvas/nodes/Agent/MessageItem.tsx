import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconBulb, IconDatabaseImport, IconRobot } from "@tabler/icons-react";
import type { Message } from "../../hooks/useExecutePrompt";
import { AcpToolBlock } from "./AcpToolBlock";
import { PlanBlock } from "./PlanBlock";

interface MessageItemProps {
  message: Message;
  index: number;
  contextUpdated?: boolean;
}

export const MessageItem = ({ message, index, contextUpdated }: MessageItemProps) => {
  if (message.type === "context") {
    return (
      <div className='ev ev-context'>
        <span className='ev-ico'>
          <IconDatabaseImport size={14} />
        </span>
        <span className='ev-main'>
          <span className='ev-title'>
            {contextUpdated ? "Context updated" : "Context inserted"}
          </span>
          <span className='ev-sub'>Query and result</span>
        </span>
      </div>
    );
  }

  if (message.type === "thought") {
    return (
      <div className='ev ev-thought'>
        <span className='ev-ico'>
          <IconBulb size={14} />
        </span>
        <span className='ev-main'>
          <span className='ev-title'>Thinking</span>
          <span className='ev-thought-body'>{message.message}</span>
        </span>
      </div>
    );
  }

  if (message.type === "plan") {
    return <PlanBlock entries={message.planEntries ?? []} />;
  }

  if (message.type === "acp_tool") {
    return <AcpToolBlock message={message} />;
  }

  if (message.type === "system") {
    if (index === 0) {
      return null;
    }
    return (
      <div className='ev ev-system'>
        <span className='ev-ico'>
          <IconRobot size={14} />
        </span>
        <span className='ev-main'>
          <span className='ev-title'>{message.message}</span>
          <span className='ev-sub'>Just for you</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`msg msg-${message.type}`}>
      <div className='msg-role'>
        <span className='role-dot' />
        <span className='role-name'>{message.type === "user" ? "User" : "Assistant"}</span>
      </div>
      <div className='message-content'>
        <Markdown remarkPlugins={[remarkGfm]}>{message.message}</Markdown>
      </div>
    </div>
  );
};
