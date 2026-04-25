import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const profile = useProfile(user?.id);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="font-display text-2xl">murmur</Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "p-2.5 rounded-full transition",
                isActive("/") ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              aria-label="Feed"
            >
              <Home className="w-5 h-5" />
            </Link>
            {user && profile.data ? (
              <Link
                to={`/u/${profile.data.username}`}
                className={cn(
                  "p-2.5 rounded-full transition",
                  isActive("/u") ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                aria-label="Profile"
              >
                <UserIcon className="w-5 h-5" />
              </Link>
            ) : null}
            {user ? (
              <button
                onClick={async () => { await signOut(); navigate("/auth"); }}
                className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to="/auth"
                className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                aria-label="Sign in"
              >
                <LogIn className="w-5 h-5" />
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
