
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onExport: () => void;
  disabled: boolean;
}

const ExportButton = ({ onExport, disabled }: ExportButtonProps) => {
  return (
    <Button
      onClick={onExport}
      size="sm"
      variant="outline"
      className="rounded-full h-9 btn-hover mr-2"
      disabled={disabled}
    >
      <FileSpreadsheet className="h-4 w-4 sm:mr-1" />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
};

export default ExportButton;
