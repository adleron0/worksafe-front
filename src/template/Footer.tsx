import { HeartFilledIcon } from "@radix-ui/react-icons"

const Footer = () => {
  return (
    <footer className="flex gap-1 items-center text-xs bg- border-t justify-center py-2 text-muted-foreground p-safe-bottom">
      <span>© 2025 WorkSafe - Made with</span>
      <HeartFilledIcon className="text-primary"/>
      <span>by Adleron</span>
    </footer>
  );
};

export default Footer;
