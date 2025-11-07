import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Save, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const GradeInputEdit = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "teacher") {
      navigate("/auth");
    }
  }, [isAuthenticated, user, navigate]);

  // Get parameters from URL
  const selectedCourse = searchParams.get("course") || "cs101";
  const selectedSection = searchParams.get("section") || "12-polaris";
  const selectedTerm = searchParams.get("term") || "midterm";
  const selectedSemester = searchParams.get("semester") || "1st";

  const courseInfo = {
    code: "CS101",
    title: "Introduction to the Philosophy of the Human",
    teacher: "Aleck Jean F. Siscar",
    section: "12-Polaris",
  };

  const [grades, setGrades] = useState([
    { id: "2024001", name: "Alagasi, Hyden Cristia A.", w1: 10, w2: 10, w3: 91, w4: 10, w5: 8, w6: 8, w7: 38, w8: 85, p1: 30, p2: 15, p3: 0, p4: 0, p5: 0, exam: 60 },
    { id: "2024002", name: "Algoy, Ann Ruslyn My Tolentino", w1: 10, w2: 10, w3: 80, w4: 8, w5: 8, w6: 8, w7: 25, w8: 85, p1: 30, p2: 14, p3: 0, p4: 0, p5: 0, exam: 31 },
    { id: "2024003", name: "Alvarez, Jezzabel Orallo", w1: 10, w2: 10, w3: 84, w4: 10, w5: 8, w6: 8, w7: 25, w8: 85, p1: 30, p2: 15, p3: 0, p4: 0, p5: 0, exam: 38 },
    { id: "2024004", name: "Ariola, Marienyque Angel R.", w1: 10, w2: 10, w3: 98, w4: 10, w5: 8, w6: 8, w7: 45, w8: 85, p1: 30, p2: 15, p3: 0, p4: 0, p5: 0, exam: 49 },
    { id: "2024005", name: "Austria, Jaila Marie Amiten", w1: 10, w2: 10, w3: 88, w4: 10, w5: 8, w6: 8, w7: 32, w8: 85, p1: 30, p2: 13, p3: 0, p4: 0, p5: 0, exam: 17 },
  ]);

  const transmute = (percentage: number): string => {
    if (percentage >= 97) return "1.00";
    if (percentage >= 94) return "1.25";
    if (percentage >= 91) return "1.50";
    if (percentage >= 88) return "1.75";
    if (percentage >= 85) return "2.00";
    if (percentage >= 82) return "2.25";
    if (percentage >= 79) return "2.50";
    if (percentage >= 76) return "2.75";
    if (percentage >= 75) return "3.00";
    return "5.00";
  };

  const handleCellValueChanged = useCallback((event: any) => {
    const { data } = event;
    setGrades(prev => prev.map(g => g.id === data.id ? data : g));
  }, []);

  const calculateWrittenTotal = (row: any) => {
    return (row.w1 || 0) + (row.w2 || 0) + (row.w3 || 0) + (row.w4 || 0) + (row.w5 || 0) + (row.w6 || 0) + (row.w7 || 0) + (row.w8 || 0);
  };

  const calculatePerformanceTotal = (row: any) => {
    return (row.p1 || 0) + (row.p2 || 0) + (row.p3 || 0) + (row.p4 || 0) + (row.p5 || 0);
  };

  const columnDefs = useMemo(() => [
    {
      headerName: "Student Info",
      children: [
        {
          field: "id",
          headerName: "ID",
          width: 100,
          pinned: "left",
          headerClass: 'col-id',
          cellStyle: (params: any) => ({
            fontWeight: params.node.rowPinned ? "700" : "bold",
            color: params.node.rowPinned ? "#374151" : "inherit",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          field: "name",
          headerName: "Learner's Name",
          width: 300,
          pinned: "left",
          // Modern AG Grid React inline component approach
          cellRenderer: (props: any) => {
            const rowIndex = (props.node && typeof props.node.rowIndex === 'number') ? props.node.rowIndex + 1 : '';
            return (
              <div className="student-name">
                <div className="student-name-line">{props.value}</div>
              </div>
            );
          },
          cellStyle: (params: any) => ({
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#ffffff",
            fontWeight: params.node.rowPinned ? "700" : "600",
            color: params.node.rowPinned ? "#374151" : "inherit"
          })
        },
      ],
    },
    {
      headerName: "Written Works (30%)",
      headerClass: 'group-header-blue',
      children: [
        { field: "w1", headerName: "1", width: 70, editable: true, type: "numericColumn" },
        { field: "w2", headerName: "2", width: 70, editable: true, type: "numericColumn" },
        { field: "w3", headerName: "3", width: 70, editable: true, type: "numericColumn" },
        { field: "w4", headerName: "4", width: 70, editable: true, type: "numericColumn" },
        { field: "w5", headerName: "5", width: 70, editable: true, type: "numericColumn" },
        { field: "w6", headerName: "6", width: 70, editable: true, type: "numericColumn" },
        { field: "w7", headerName: "7", width: 70, editable: true, type: "numericColumn" },
        { field: "w8", headerName: "8", width: 70, editable: true, type: "numericColumn" },
        {
          headerName: "Total",
          width: 80,
          valueGetter: (params: any) => calculateWrittenTotal(params.data),
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculateWrittenTotal(params.data);
            return ((total / 80) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dbeafe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculateWrittenTotal(params.data);
            return ((total / 80) * 30).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Performance Tasks (40%)",
      headerClass: 'group-header-green',
      children: [
        { field: "p1", headerName: "1", width: 70, editable: true, type: "numericColumn" },
        { field: "p2", headerName: "2", width: 70, editable: true, type: "numericColumn" },
        { field: "p3", headerName: "3", width: 70, editable: true, type: "numericColumn" },
        { field: "p4", headerName: "4", width: 70, editable: true, type: "numericColumn" },
        { field: "p5", headerName: "5", width: 70, editable: true, type: "numericColumn" },
        {
          headerName: "Total",
          width: 80,
          valueGetter: (params: any) => calculatePerformanceTotal(params.data),
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculatePerformanceTotal(params.data);
            return ((total / 45) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const total = calculatePerformanceTotal(params.data);
            return ((total / 45) * 40).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#bbf7d0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Exam (30%)",
      headerClass: 'group-header-amber',
      children: [
        { field: "exam", headerName: "Score", width: 80, editable: true, type: "numericColumn" },
        {
          headerName: "PS",
          width: 80,
          valueGetter: (params: any) => {
            const exam = params.data.exam || 0;
            return ((exam / 60) * 100).toFixed(2) + "%";
          },
          cellStyle: (params: any) => ({
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "WS",
          width: 80,
          valueGetter: (params: any) => {
            const exam = params.data.exam || 0;
            return ((exam / 60) * 30).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#fde68a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
      ],
    },
    {
      headerName: "Midterm Grade",
      headerClass: 'group-header-accent',
      children: [
        {
          headerName: "Initial",
          width: 100,
          valueGetter: (params: any) => {
            const writtenTotal = calculateWrittenTotal(params.data);
            const writtenWS = (writtenTotal / 80) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data);
            const performanceWS = (performanceTotal / 45) * 40;
            const exam = params.data.exam || 0;
            const examWS = (exam / 60) * 30;
            return (writtenWS + performanceWS + examWS).toFixed(2);
          },
          cellStyle: (params: any) => ({
            fontWeight: "bold",
            backgroundColor: params.node.rowPinned ? "#f9fafb" : "#f3e8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }),
        },
        {
          headerName: "Grade",
          width: 100,
          valueGetter: (params: any) => {
            const writtenTotal = calculateWrittenTotal(params.data);
            const writtenWS = (writtenTotal / 80) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data);
            const performanceWS = (performanceTotal / 45) * 40;
            const exam = params.data.exam || 0;
            const examWS = (exam / 60) * 30;
            const initialGrade = writtenWS + performanceWS + examWS;
            return transmute(initialGrade);
          },
          cellStyle: (params: any) => {
            if (params.node.rowPinned) {
              return {
                backgroundColor: "#f9fafb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600"
              };
            }
            const writtenTotal = calculateWrittenTotal(params.data);
            const writtenWS = (writtenTotal / 80) * 30;
            const performanceTotal = calculatePerformanceTotal(params.data);
            const performanceWS = (performanceTotal / 45) * 40;
            const exam = params.data.exam || 0;
            const examWS = (exam / 60) * 30;
            const initialGrade = writtenWS + performanceWS + examWS;
            const gradeStr = transmute(initialGrade);
            const isPass = parseFloat(gradeStr) <= 3.0;
            return {
              fontWeight: "700",
              fontSize: "14px",
              backgroundColor: isPass ? "#d1fae5" : "#fee2e2",
              color: isPass ? "#065f46" : "#991b1b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            };
          },
        },
      ],
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false, // remove filters but keep sorting on header
    resizable: true,
  }), []);

  // Grid API refs to keep column state persistent and support autosize
  const gridApiRef = useRef<any>(null);
  const columnApiRef = useRef<any>(null);

  // Highest Possible Score (pinned top row) values
  const pinnedTopRow = useMemo(() => ({
    id: '',
    name: 'HPS →',
    w1: 10, w2: 10, w3: 10, w4: 10, w5: 10, w6: 10, w7: 10, w8: 10,
    p1: 30, p2: 15, p3: 0, p4: 0, p5: 0,
    exam: 60,
    __hps: true,
  }), []);

  const onGridReady = useCallback((params: any) => {
    gridApiRef.current = params.api;
    columnApiRef.current = params.columnApi;
    // make columns fit initially
    try {
      const allCols = params.columnApi.getAllColumns();
      params.columnApi.autoSizeColumns(allCols.map((c: any) => c.getId()), false);
    } catch (e) {
      // ignore autosize errors
    }
    // set pinned top row (HPS)
    try {
      params.api.setPinnedTopRowData([pinnedTopRow]);
    } catch (e) {
      // ignore if api not ready
    }
  }, [pinnedTopRow]);

  const autoSizeAllColumns = useCallback(() => {
    if (!columnApiRef.current) return;
    const allCols = columnApiRef.current.getAllColumns();
    const colIds = allCols.map((c: any) => c.getId());
    columnApiRef.current.autoSizeColumns(colIds, false);
  }, []);

  const handleSaveGrades = () => {
    alert("Grades saved successfully!");
    navigate(-1);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen flex flex-col p-4 bg-background">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Class Record</h1>
            <p className="text-sm text-muted-foreground">{courseInfo.code} - {selectedTerm === "midterm" ? "Midterm" : "Final Term"}</p>
          </div>
        </div>
        <Button onClick={handleSaveGrades}>
          <Save className="h-4 w-4 mr-2" />
          Save & Close
        </Button>
      </div>

      {/* Course Info Banner */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{courseInfo.code} - {courseInfo.title}</p>
              <p className="text-sm text-muted-foreground">Teacher: {courseInfo.teacher} | Section: {courseInfo.section}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedSemester} Semester - {selectedTerm === "midterm" ? "Midterm" : "Final Term"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Students Count */}
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="text-sm font-medium">Total Students: {grades.length}</div>
        <div className="text-sm text-muted-foreground">HPS = Highest Possible Score • PS = Percentage Score • WS = Weighted Score</div>
      </div>

      {/* AG Grid Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Full Edit View
              </CardTitle>
              <CardDescription>
                Click cells to edit • Drag column borders to resize • Sort by clicking column headers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="ag-theme-quartz h-full" style={{ "--ag-font-size": "13px" } as any}>
            <AgGridReact
              rowData={grades}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={handleCellValueChanged}
              onGridReady={onGridReady}
              headerHeight={40}
              groupHeaderHeight={40}
              rowHeight={56}
              animateRows={true}
              rowSelection="single"
              suppressRowClickSelection={true}
              suppressCellFocus={false}
              pagination={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeInputEdit;
