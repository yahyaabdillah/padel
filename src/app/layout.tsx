import { Outfit } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AccessProvider } from "@/context/AccessContext";
import { OperatingHoursProvider } from "@/context/OperatingHoursContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ToastProvider } from "@/components/ui/toast/ToastContext";

const outfit = Outfit({ subsets: ["latin"] });

const browserExtensionHydrationGuard = `
(() => {
  const originalConsoleError = console.error.bind(console);

  console.error = (...args) => {
    const message = args.map((arg) => String(arg)).join("\\n");
    const isExtensionHydrationWarning =
      message.includes("hydrated but some attributes") &&
      (message.includes("bis_") || message.includes("__processed_"));

    if (isExtensionHydrationWarning) return;
    originalConsoleError(...args);
  };

  const clean = (element) => {
    if (!element || !element.attributes) return;

    for (const attribute of Array.from(element.attributes)) {
      if (
        attribute.name.startsWith("bis_") ||
        attribute.name.startsWith("__processed_")
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  };

  const cleanTree = () => {
    clean(document.documentElement);
    clean(document.body);
    document.querySelectorAll("[bis_skin_checked], [bis_register]").forEach(clean);

    document.querySelectorAll("*").forEach((element) => {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.startsWith("__processed_")) {
          element.removeAttribute(attribute.name);
        }
      }
    });
  };

  cleanTree();

  new MutationObserver(cleanTree).observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
})();
`;

export const metadata = {
  title: "PadelHub — Padel Club Management SaaS",
  description:
    "Multi-tenant padel club management: bookings, members, coaching, open play, POS and finance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-gray-50" suppressHydrationWarning>
      <head>
        <script
          id="browser-extension-hydration-guard"
          dangerouslySetInnerHTML={{
            __html: browserExtensionHydrationGuard,
          }}
        />
      </head>
      <body
        className={`${outfit.className} dark:bg-gray-900`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <RoleProvider>
            <AccessProvider>
              <OperatingHoursProvider>
                <NotificationProvider>
                  <ToastProvider>
                    <SidebarProvider>{children}</SidebarProvider>
                  </ToastProvider>
                </NotificationProvider>
              </OperatingHoursProvider>
            </AccessProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
