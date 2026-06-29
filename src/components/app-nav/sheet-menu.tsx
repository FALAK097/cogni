import Link from "next/link";
import { MenuIcon } from "@/components/icons";

import { Menu } from "@/components/app-nav/menu";
import { ThemeLogo } from "@/components/theme-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger
        className="lg:hidden"
        render={
          <Button className="h-8" variant="outline" size="icon">
            <MenuIcon size={20} />
          </Button>
        }
      />
      <SheetContent
        className="flex flex-col h-full px-3 sm:w-56"
        side="left"
        title="Navigation Menu"
      >
        <SheetHeader>
          <div className="flex items-center justify-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ThemeLogo className="flex-shrink-0 w-6 h-6" />
              <h1
                className={cn(
                  "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                )}
              >
                <span className="text-base font-bold transition-all sm:text-lg">{SITE_NAME}</span>
              </h1>
            </Link>
          </div>
        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
