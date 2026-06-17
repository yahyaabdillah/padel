import { Outfit } from "next/font/google";
import "./globals.css";
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RoleProvider } from "@/context/RoleContext";
import { AccessProvider } from "@/context/AccessContext";
import { OperatingHoursProvider } from "@/context/OperatingHoursContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { PromoProvider } from "@/context/PromoContext";
import { MembershipProvider } from "@/context/MembershipContext";
import { FormBuilderProvider } from "@/context/FormBuilderContext";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { ToastProvider } from "@/components/ui/toast/ToastContext";
import OnboardingPrompt from "@/components/member/OnboardingPrompt";

const outfit = Outfit({ subsets: ["latin"] });

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
    <html lang="en" className="bg-gray-50">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <RoleProvider>
            <OnboardingProvider>
              <AccessProvider>
                <OperatingHoursProvider>
                  <NotificationProvider>
                    <PromoProvider>
                      <MembershipProvider>
                        <FormBuilderProvider>
                          <ToastProvider>
                            <SidebarProvider>
                              {children}
                              <OnboardingPrompt />
                            </SidebarProvider>
                          </ToastProvider>
                        </FormBuilderProvider>
                      </MembershipProvider>
                    </PromoProvider>
                  </NotificationProvider>
                </OperatingHoursProvider>
              </AccessProvider>
            </OnboardingProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
