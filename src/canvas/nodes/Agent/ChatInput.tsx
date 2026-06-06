import { IconPlayerStop, IconSend } from "@tabler/icons-react";
import { useLayoutEffect, useRef } from "react";

const MAX_HEIGHT = 160;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  return (
    <div className='chat-input-container'>
      <div className='input-wrapper'>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading) {
                onSubmit();
              }
            }
          }}
          placeholder='Ask about your data, or describe what to build...'
          className={`chat-input ${isLoading ? "loading" : ""}`}
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={isLoading ? onStop : onSubmit}
          disabled={!isLoading && !value.trim()}
          className={`send-button ${isLoading ? "loading" : ""}`}
        >
          {isLoading ? <IconPlayerStop size={20} /> : <IconSend size={20} />}
        </button>
      </div>
    </div>
  );
}
