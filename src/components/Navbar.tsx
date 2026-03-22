import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Plus, MessageCircle, User, LogOut } from "lucide-react";
import { useState } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold text-primary">
          <BrandIcon className="h-7 w-7" />
          {t("common.brand")}
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <Link to="/annonces" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.browse")}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              {user.role === "admin" && (
                <Link to="/annonces/nouvelle">
                  <Button size="sm" className="gap-1.5 font-heading font-semibold">
                    <Plus className="h-4 w-4" /> {t("nav.publish")}
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-1">
                <NotificationBell />
                <Link to="/messages" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/mon-compte" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> {t("nav.account")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" /> {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="font-heading font-semibold">{t("nav.login")}</Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          {user && <NotificationBell />}
          <button type="button" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link to="/annonces" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
              {t("nav.browse")}
            </Link>
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link to="/annonces/nouvelle" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" className="w-full gap-1.5 font-heading font-semibold">
                      <Plus className="h-4 w-4" /> {t("nav.publish")}
                    </Button>
                  </Link>
                )}
                <Link to="/messages" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
                  {t("nav.messages")}
                </Link>
                <Link to="/mon-compte" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
                  {t("nav.account")}
                </Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="text-sm font-medium text-destructive text-left">
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full font-heading font-semibold">{t("nav.login")}</Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
