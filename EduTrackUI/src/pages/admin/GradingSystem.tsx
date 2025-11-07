import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertMessage } from "@/components/AlertMessage";
import { Award, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

type GradeRange = {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint: number;
  description: string;
};

type ComputationCategory = {
  name: string;
  weight: number;
  components: string[];
};

const GradingSystem = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>([
    { grade: "A+", minPercentage: 97, maxPercentage: 100, gradePoint: 1.0, description: "Excellent / Outstanding" },
    { grade: "A", minPercentage: 94, maxPercentage: 96, gradePoint: 1.25, description: "Excellent" },
    { grade: "A-", minPercentage: 91, maxPercentage: 93, gradePoint: 1.5, description: "Very Good" },
    { grade: "B+", minPercentage: 88, maxPercentage: 90, gradePoint: 1.75, description: "Good" },
    { grade: "B", minPercentage: 85, maxPercentage: 87, gradePoint: 2.0, description: "Satisfactory / Above Avg" },
    { grade: "B-", minPercentage: 82, maxPercentage: 84, gradePoint: 2.25, description: "Average" },
    { grade: "C+", minPercentage: 79, maxPercentage: 81, gradePoint: 2.5, description: "Fair / Below Average" },
    { grade: "C", minPercentage: 76, maxPercentage: 78, gradePoint: 2.75, description: "Passing / Marginal" },
    { grade: "C-", minPercentage: 75, maxPercentage: 75, gradePoint: 3.0, description: "Minimum Pass" },
    { grade: "F", minPercentage: 0, maxPercentage: 74, gradePoint: 5.0, description: "Fail" },
  ]);

  const [computationWeights, setComputationWeights] = useState<ComputationCategory[]>([
    { name: "Written", weight: 30, components: ["Quiz", "Written Output"] },
    { name: "Exam", weight: 30, components: ["Midterm", "Final Term"] },
    { name: "Performance", weight: 40, components: ["Project", "Attendance", "Lab"] },
  ]);

  const [alert, setAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [editingGradeIndex, setEditingGradeIndex] = useState<number | null>(null);

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  const handleGradeRangeChange = (index: number, field: keyof GradeRange, value: any) => {
    const updated = [...gradeRanges];
    updated[index] = { ...updated[index], [field]: value };
    setGradeRanges(updated);
  };

  const handleWeightChange = (index: number, value: number) => {
    const updated = [...computationWeights];
    updated[index] = { ...updated[index], weight: value };
    setComputationWeights(updated);
  };

  const validateGradeRanges = (): boolean => {
    const totalWeight = computationWeights.reduce((sum, cat) => sum + cat.weight, 0);
    if (totalWeight !== 100) {
      showAlert("error", `Total weight must equal 100% (Currently: ${totalWeight}%)`);
      return false;
    }

    for (let i = 0; i < gradeRanges.length - 1; i++) {
      if (gradeRanges[i].minPercentage < 0 || gradeRanges[i].maxPercentage > 100) {
        showAlert("error", "Grade ranges must be between 0-100%");
        return false;
      }
    }

    return true;
  };

  const saveGradeScale = () => {
    if (!validateGradeRanges()) return;
    showAlert("success", "Grade scale configuration saved successfully!");
  };

  const saveComputationRules = () => {
    if (!validateGradeRanges()) return;
    showAlert("success", "Computation rules updated successfully!");
  };

  const calculateTotalWeight = () => {
    return computationWeights.reduce((sum, cat) => sum + cat.weight, 0);
  };

  const totalWeight = calculateTotalWeight();

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Grading System
          </h1>
          <p className="text-muted-foreground">Configure grades and computation weights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Grade Scale & Computation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Grade Scale Configuration - Compact Table View */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Grade Scale
                  </CardTitle>
                  <CardDescription className="text-sm">Click on any field to edit</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-accent-200">
                        <th className="text-left py-2 px-3 font-semibold">Grade</th>
                        <th className="text-center py-2 px-3 font-semibold">Min %</th>
                        <th className="text-center py-2 px-3 font-semibold">Max %</th>
                        <th className="text-center py-2 px-3 font-semibold">Points</th>
                        <th className="text-left py-2 px-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-accent-100">
                      {gradeRanges.map((grade, index) => (
                        <tr key={index} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3">
                            <Badge className="bg-gradient-to-r from-primary to-accent text-white font-bold text-base w-12 h-10 flex items-center justify-center rounded-lg">
                              {grade.grade}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              value={grade.minPercentage}
                              onChange={(e) => handleGradeRangeChange(index, "minPercentage", parseInt(e.target.value))}
                              className="w-16 h-8 text-center border-1 rounded p-1 text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              value={grade.maxPercentage}
                              onChange={(e) => handleGradeRangeChange(index, "maxPercentage", parseInt(e.target.value))}
                              className="w-16 h-8 text-center border-1 rounded p-1 text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Input 
                              type="number" 
                              step="0.25"
                              min="0"
                              max="5"
                              value={grade.gradePoint}
                              onChange={(e) => handleGradeRangeChange(index, "gradePoint", parseFloat(e.target.value))}
                              className="w-16 h-8 text-center border-1 rounded p-1 text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-slate-700 text-xs">
                            <Input 
                              value={grade.description}
                              onChange={(e) => handleGradeRangeChange(index, "description", e.target.value)}
                              className="border-1 rounded p-1 text-xs h-8"
                              placeholder="Description"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <Button 
                  onClick={saveGradeScale}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-accent text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Grade Scale
                </Button>
              </CardContent>
            </Card>

            {/* Grade Computation Weights */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Computation Weights
                  </CardTitle>
                  <CardDescription className="text-sm">Total weight must equal 100%</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Total Weight Indicator */}
                <div className={`rounded-lg p-3 mb-4 text-sm font-semibold flex items-center justify-between ${
                  totalWeight === 100 
                    ? "bg-green-50 border border-green-200 text-green-900" 
                    : "bg-amber-50 border border-amber-200 text-amber-900"
                }`}>
                  <span>Total Weight</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          totalWeight === 100 ? "bg-green-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(totalWeight, 100)}%` }}
                      />
                    </div>
                    <Badge className={totalWeight === 100 ? "bg-green-100 text-green-900 border border-green-300" : "bg-amber-100 text-amber-900 border border-amber-300"}>
                      {totalWeight}%
                    </Badge>
                  </div>
                </div>

                {/* Computation Categories */}
                <div className="space-y-3">
                  {computationWeights.map((category, index) => (
                    <div key={index} className="border border-accent-200 rounded-lg p-3 bg-gradient-to-br from-card to-muted/30">
                      <div className="flex items-end gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{category.name}</p>
                          <p className="text-xs text-muted-foreground">{category.components.join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0"
                            max="100"
                            value={category.weight}
                            onChange={(e) => handleWeightChange(index, parseInt(e.target.value))}
                            className="w-20 h-8 text-center border-1 rounded p-1 text-sm font-semibold"
                          />
                          <span className="text-sm font-semibold w-6">%</span>
                        </div>
                      </div>
                      
                      {/* Weight Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                            style={{ width: `${Math.min(category.weight, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={saveComputationRules}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-accent text-white font-semibold py-2 rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Computation Rules
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Quick Reference */}
          <div className="space-y-4">
            {/* Calculation Formula */}
        <Card className="shadow-lg border-0 bg-primary/10">
          <CardHeader className="bg-primary/20 border-b pb-3">
                <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  📊 Calculation Formula
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="bg-card rounded p-2 font-mono text-xs space-y-1 text-muted-foreground max-h-32 overflow-y-auto">
                  <p className="break-words">
                    <span className="font-bold">Final Grade =</span>
                  </p>
                  {computationWeights.map((cat) => (
                    <p key={cat.name} className="break-words">
                      ({cat.name} Avg × {cat.weight}%)
                      {computationWeights.indexOf(cat) !== computationWeights.length - 1 && " +"}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grade Reference */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-3">
                <CardTitle className="text-sm font-bold">Grade Reference</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {gradeRanges.map((grade) => (
                    <div key={grade.grade} className="flex items-center justify-between text-xs p-2 bg-card/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-primary to-accent text-white font-bold w-8 h-8 flex items-center justify-center rounded">
                          {grade.grade}
                        </Badge>
                        <div>
                          <p className="font-semibold">{grade.description}</p>
                          <p className="text-muted-foreground">{grade.minPercentage}–{grade.maxPercentage}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weight Breakdown */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-muted/50 to-muted border-b pb-3">
                <CardTitle className="text-sm font-bold">Weight Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {computationWeights.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs p-2 bg-card/50 rounded">
                      <span className="font-semibold">{cat.name}</span>
                      <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-accent/10 text-primary font-bold text-xs">
                        {cat.weight}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {alert && (
          <AlertMessage 
            type={alert.type} 
            message={alert.message} 
            onClose={() => setAlert(null)} 
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default GradingSystem;
