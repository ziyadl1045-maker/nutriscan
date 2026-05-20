import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import logoImage from "@assets/generated_images/professional_logo_for_nutriscan_app..png";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
});

export default function AuthPage() {
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      username: localStorage.getItem("rememberedUsername") || "",
      password: "",
      rememberMe: !!localStorage.getItem("rememberedUsername"),
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
    },
  });

  // Auto-generate username from email
  const emailValue = registerForm.watch("email");
  useEffect(() => {
    if (emailValue && !registerForm.getValues("username")) {
      const suggestedUsername = emailValue
        .split("@")[0]
        .replace(/[^a-zA-Z0-9]/g, "");
      if (suggestedUsername.length >= 3) {
        registerForm.setValue("username", suggestedUsername);
      }
    }
  }, [emailValue, registerForm]);

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    try {
      if (data.rememberMe) {
        localStorage.setItem("rememberedUsername", data.username);
      } else {
        localStorage.removeItem("rememberedUsername");
      }
      await login(data);
      toast({
        title: "Connexion réussie",
        description: `Ravi de vous revoir, ${data.username} !`,
      });
      setLocation("/scan");
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Nom d'utilisateur ou mot de passe incorrect.";

      // Try to extract more specific error from status or response body if available
      if (error.message?.includes("401")) {
        errorMessage =
          "Identifiants invalides. Veuillez vérifier votre nom d'utilisateur et votre mot de passe.";
      }

      toast({
        variant: "destructive",
        title: "Connexion échouée",
        description: errorMessage,
      });
    }
  };

  const onRegister = async (data: z.infer<typeof registerSchema>) => {
    try {
      await register(data);
      toast({
        title: "Compte créé avec succès",
        description: "Bienvenue sur NutriScan ! Vous pouvez commencer à scanner.",
      });
      setLocation("/scan");
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message?.includes("400")) {
        try {
          const body = JSON.parse(error.message.split(": ")[1]);
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description:
              body.message || "Please check your details and try again.",
          });
        } catch (e) {
          toast({
            variant: "destructive",
            title: "Registration Failed",
            description:
              "An account with this email or username already exists.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Registration Error",
          description: "Something went wrong. Please try again later.",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-[20%] w-[60%] h-[60%] bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <img
              src={logoImage}
              alt="NutriScan Logo"
              className="w-20 h-20 rounded-2xl shadow-lg mb-2"
            />
            <div className="text-primary font-bold text-2xl">NutriScan</div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
          </TabsList>

          <motion.div
            key={activeTab}
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent
              value="login"
              forceMount
              className={activeTab === "login" ? "" : "hidden"}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Connexion</CardTitle>
                  <CardDescription>
                    Connectez-vous pour accéder à votre historique de scan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLogin)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur</FormLabel>
                            <FormControl>
                              <Input placeholder="votre_pseudo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={field.value}
                                onChange={(e) =>
                                  field.onChange(e.target.checked)
                                }
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Se souvenir de moi
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Se connecter
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="register"
              forceMount
              className={activeTab === "register" ? "" : "hidden"}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Créer un compte</CardTitle>
                  <CardDescription>
                    Inscrivez-vous pour commencer à scanner vos produits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegister)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="jean@exemple.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom d'utilisateur</FormLabel>
                            <FormControl>
                              <Input placeholder="pseudo123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mot de passe</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isRegistering}
                      >
                        {isRegistering && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        S'inscrire
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </motion.div>
        </Tabs>
      </motion.div>
    </div>
  );
}
