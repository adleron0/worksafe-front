import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from "./Icon";

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

// Lista de ícones populares do Lucide React - sem duplicatas
const ALL_ICONS = [
  "shield", "shield-check", "shield-alert", "shield-off", "shield-ban", "shield-ellipsis",
  "hard-hat", "helmet", "construction",
  "alert-triangle", "alert-circle", "alert-octagon",
  "user", "users", "user-check", "user-plus", "user-x", "user-minus", "user-circle", "user-square",
  "book", "book-open", "graduation-cap", "award", "medal", "trophy",
  "clipboard", "clipboard-check", "clipboard-list", "clipboard-copy", "clipboard-paste",
  "file", "file-text", "file-check", "file-x", "file-plus", "file-minus", "file-search",
  "calendar", "calendar-check", "calendar-clock", "calendar-days", "calendar-x", "calendar-plus",
  "clock", "timer", "alarm-clock", "stopwatch", "hourglass",
  "check", "check-circle", "check-square", "badge-check", "circle-check",
  "x", "x-circle", "x-square", "ban", "circle-x",
  "settings", "wrench", "tool", "hammer", "screwdriver", "drill",
  "heart", "heart-handshake", "heart-pulse", "heart-crack", "heart-off",
  "star", "star-half", "stars", "sparkles", "sparkle",
  "flag", "flag-triangle-right", "milestone", "target", "goal",
  "map", "map-pin", "navigation", "compass", "locate", "map-pinned",
  "home", "building", "building-2", "factory", "warehouse", "store",
  "truck", "car", "bus", "train", "bike", "plane", "ship",
  "phone", "mail", "message-square", "message-circle", "messages-square", "mail-open",
  "camera", "image", "video", "mic", "mic-off", "camera-off", "video-off",
  "wifi", "wifi-off", "signal", "antenna", "radio", "bluetooth",
  "battery", "battery-charging", "battery-low", "battery-full", "battery-warning",
  "sun", "moon", "cloud", "cloud-rain", "cloud-snow", "cloud-lightning", "fog",
  "fire", "flame", "zap", "wind", "tornado",
  "droplet", "droplets", "waves", "snowflake", "thermometer-sun", "thermometer-snowflake",
  "tree", "leaf", "flower", "sprout", "trees", "palmtree", "flower-2",
  "mountain", "mountain-snow", "tent", "campfire", "backpack", "footprints",
  "pizza", "coffee", "utensils", "glass-water", "beer", "wine", "cake", "cookie",
  "activity", "airplay", "aperture", "apple", "archive", "anchor",
  "arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-up-right", "arrow-down-left",
  "bar-chart", "bar-chart-2", "bar-chart-3", "bar-chart-4", "line-chart", "pie-chart",
  "bell", "bell-off", "bell-ring", "bell-plus", "bell-minus", "bell-dot",
  "bold", "bookmark", "box", "boxes", "package-2",
  "briefcase", "calculator", "cast", "chrome", "circle-dot",
  "chevron-down", "chevron-left", "chevron-right", "chevron-up", "chevrons-down", "chevrons-up",
  "circle", "code", "code-2", "command", "terminal-square", "code-xml",
  "cpu", "credit-card", "crop", "crown", "currency", "crosshair",
  "database", "disc", "dollar-sign", "euro", "pound-sterling",
  "download", "download-cloud", "edit", "edit-2", "edit-3", "pen", "pencil",
  "eye", "eye-off", "fast-forward", "feather", "figma", "file-archive",
  "film", "filter", "folder", "folder-open", "folder-plus", "folder-minus",
  "gift", "git-branch", "git-commit", "git-merge", "git-pull-request", "github",
  "globe", "grid", "hash", "headphones", "headphones-icon", "headset",
  "help-circle", "hexagon", "history", "info", "infinity", "instagram",
  "italic", "key", "layers", "layout-grid", "layout-list",
  "list", "loader", "lock", "log-in", "log-out", "lock-open",
  "maximize", "maximize-2", "menu", "minimize", "minimize-2", "minus",
  "monitor", "more-horizontal", "more-vertical", "mouse-pointer", "mouse", "move",
  "music", "octagon", "package", "palette", "paperclip", "pause",
  "pause-circle", "pen-tool", "percent", "play", "play-circle", "plus",
  "pocket", "power", "printer", "puzzle", "qr-code", "quote",
  "refresh-ccw", "refresh-cw", "repeat", "rewind", "rocket", "rotate-3d",
  "rotate-ccw", "rotate-cw", "rss", "save", "scale", "scan",
  "scissors", "search", "send", "server", "settings-2", "share",
  "share-2", "shopping-bag", "shopping-cart", "shrink", "shuffle", "sidebar",
  "skip-back", "skip-forward", "slack", "slash", "sliders", "smartphone",
  "smile", "speaker", "square", "stop-circle", "sun-dim", "sun-medium",
  "sunrise", "sunset", "tablet", "tag", "tags", "telescope",
  "terminal", "thermometer", "thumbs-down", "thumbs-up", "ticket", "timer-reset",
  "toggle-left", "toggle-right", "trash", "trash-2", "trello", "trending-down",
  "trending-up", "triangle", "tv", "twitter", "type", "umbrella",
  "underline", "unlock", "upload", "upload-cloud", "verified",
  "voicemail", "volume", "volume-1", "volume-2", "volume-x", "wallet",
  "watch", "youtube", "zoom-in", "zoom-out", "zap-off"
];

// Remove duplicatas garantindo uma lista única
const POPULAR_ICONS = [...new Set(ALL_ICONS)];

const IconPicker: React.FC<IconPickerProps> = ({
  value = "",
  onChange,
  label = "Ícone",
  placeholder = "Buscar ícone...",
  className = "",
}) => {
  const [search, setSearch] = useState("");

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) return POPULAR_ICONS;
    
    const searchLower = search.toLowerCase();
    return POPULAR_ICONS
      .filter((icon) => icon.includes(searchLower));
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange(iconName === value ? "" : iconName);
  };

  const selectedIcon = value || "";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="icon-search">
          {label}
          {selectedIcon && (
            <Badge variant="secondary" className="ml-2">
              <Icon name={selectedIcon} className="h-3 w-3 mr-1" />
              {selectedIcon}
            </Badge>
          )}
        </Label>
      )}
      
      <Input
        id="icon-search"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full"
      />
      
      <div className="border rounded-lg">
        <div 
          className="h-[200px] overflow-y-auto overflow-x-hidden p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400"
        >
          <div className="grid grid-cols-6 gap-2 w-full">
            {filteredIcons.map((iconName) => {
              const isSelected = selectedIcon === iconName;
              
              return (
                <button
                  key={iconName}
                  type="button"
                  className={`
                    h-10 w-10 p-0 flex items-center justify-center rounded-md
                    transition-all duration-200 border flex-shrink-0 cursor-pointer
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20' 
                      : 'hover:bg-accent hover:border-accent-foreground/20 border-transparent'
                    }
                  `}
                  onClick={() => handleSelect(iconName)}
                  title={iconName}
                >
                  <Icon name={iconName} className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          
          {filteredIcons.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum ícone encontrado para "{search}"
            </div>
          )}
        </div>
      </div>
      
      {selectedIcon && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <Icon name={selectedIcon} className="h-4 w-4" />
            <span className="font-mono">{selectedIcon}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-7 px-2 text-xs"
          >
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
};

export default IconPicker;