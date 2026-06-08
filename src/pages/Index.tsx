
import WeeklyChecklist from '@/components/WeeklyChecklist';
import { CheckSquare, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground pb-10">
      <header className="w-full bg-background pt-4 pb-2 px-2 sm:px-4 border-b border-border/40 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-tight flex items-center">
            <CheckSquare className="h-6 w-6 mr-2 text-primary" />
            <span>TrackrDaily</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut()}
            className="flex items-center gap-1"
            title={user?.email ?? 'Sign out'}
          >
            <LogOut className="h-4 w-4" />
            <span className={cn('', { hidden: isMobile })}>Sign out</span>
          </Button>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-2 sm:px-4 mt-6 flex-1">
        <div className="animate-fade-in">
          <WeeklyChecklist />
        </div>
      </main>
    </div>
  );
};

export default Index;
