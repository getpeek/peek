import { IconPlayerStop, IconSend } from "@tabler/icons-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onStop, isLoading }: ChatInputProps) {
  return (
    <div className="chat-input-container">
      <div className="input-wrapper">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading) {
                onSubmit();
              }
            }
          }}
          placeholder="Ask a question about your dataset..."
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
