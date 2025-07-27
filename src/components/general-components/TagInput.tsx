import React, { useState, useRef, KeyboardEvent } from "react";
import { X, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  separator?: string;
  placeholder?: string;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  separator = "#",
  placeholder = "Digite e pressione Enter",
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse string value into array of tags
  const parseTags = (str: string): string[] => {
    if (!str || str.trim() === "") return [];
    return str.split(separator).map(tag => tag.trim()).filter(tag => tag !== "");
  };

  // Convert tags array back to string
  const tagsToString = (tags: string[]): string => {
    return tags.join(separator);
  };

  const tags = parseTags(value);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      onChange(tagsToString(newTags));
      setInputValue("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(tagsToString(newTags));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newTags = [...tags];
    const [draggedTag] = newTags.splice(draggedIndex, 1);
    newTags.splice(dropIndex, 0, draggedTag);
    
    onChange(tagsToString(newTags));
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className={`w-full border rounded-md p-2 bg-background ${className}`}>
      <div className="flex flex-wrap gap-2 p-2 mb-2 bg-muted/30 rounded min-h-[2.5rem]">
        {tags.length === 0 ? (
          <span className="text-muted-foreground text-sm">Nenhum item cadastrado</span>
        ) : (
          tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={`flex items-center gap-1 pl-1 pr-2 py-1 cursor-move ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <GripVertical size={14} className="text-muted-foreground flex-shrink-0" />
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </Badge>
        ))
        )}
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  );
};

export default TagInput;