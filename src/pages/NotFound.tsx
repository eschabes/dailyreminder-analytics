
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MoveLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="space-y-6">
          <h1 className="text-9xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-medium">Page not found</h2>
          <p className="text-muted-foreground">
            We couldn't find the page you were looking for. It might have been moved or deleted.
          </p>
          <Button asChild className="mt-6 inline-flex items-center">
            <Link to="/">
              <MoveLeft className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
