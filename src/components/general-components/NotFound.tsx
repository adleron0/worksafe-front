import Icon from "./Icon";

interface NotFoundProps {
  message?: string;
  icon?: string;
}

const NotFound = ({ message = "Nenhum item encontrado", icon = "file-x" }: NotFoundProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Icon name={icon} className="w-10 h-10 text-gray-400 dark:text-gray-600" />
      </div>
      <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
        {message}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
        Tente ajustar os filtros ou adicionar novos itens
      </p>
    </div>
  );
};

export default NotFound;