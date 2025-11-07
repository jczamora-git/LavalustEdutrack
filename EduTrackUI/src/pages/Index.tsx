import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Users, Settings, TrendingUp, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-education.jpg";

const Index = () => {
  const features = [
    {
      icon: BookOpen,
      title: "Course Management",
      description: "Create and manage courses with ease. Track progress and engagement.",
    },
    {
      icon: FileText,
      title: "Grade Tracking",
      description: "Automated grade computation and comprehensive progress reports.",
    },
    {
      icon: TrendingUp,
      title: "Student Progress",
      description: "Monitor student performance with detailed analytics and insights.",
    },
    {
      icon: Users,
      title: "Multi-Role Access",
      description: "Tailored dashboards for students, teachers, and administrators.",
    },
  ];

  const roles = [
    {
      title: "For Students",
      description: "Access your courses, view grades, and track your academic progress.",
      features: ["View courses", "Check grades", "Track progress", "Receive notifications"],
      color: "from-primary to-accent",
    },
    {
      title: "For Teachers",
      description: "Manage courses, input grades, and monitor student performance.",
      features: ["Create courses", "Input grades", "Generate reports", "Track engagement"],
      color: "from-accent to-success",
    },
    {
      title: "For Admins",
      description: "Oversee the entire system with comprehensive management tools.",
      features: ["User management", "System configuration", "Analytics", "Grading policies"],
      color: "from-success to-warning",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold">
                Academic Excellence Made Simple
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Track Progress,
                <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent"> Empower Learning</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                A comprehensive academic tracking system designed for modern education. 
                Streamline grade management, monitor student progress, and enhance educational outcomes.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" asChild>
                  <Link to="/auth">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Join thousands of educators and students tracking academic success
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full" />
              <img 
                src={heroImage} 
                alt="Students collaborating" 
                className="relative rounded-2xl shadow-2xl w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need for Academic Success
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to simplify academic tracking and enhance educational outcomes
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Built for Every Role
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Customized experiences for students, teachers, and administrators
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <Card key={index} className="relative overflow-hidden border-border hover:shadow-xl transition-all duration-300">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.color}`} />
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{role.title}</h3>
                    <p className="text-muted-foreground">{role.description}</p>
                  </div>
                  <ul className="space-y-3">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary via-accent to-success">
            <CardContent className="p-12 text-center space-y-6">
              <GraduationCap className="h-16 w-16 text-white mx-auto" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white">
                Ready to Transform Your Academic Tracking?
              </h2>
              <p className="text-white/90 text-lg max-w-2xl mx-auto">
                Join EduTrack today and experience the future of educational management
              </p>
              <div className="pt-4">
                <Button size="lg" variant="secondary" asChild className="bg-white text-primary hover:bg-white/90">
                  <Link to="/auth">Start Your Journey</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 EduTrack. Empowering education through technology.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
