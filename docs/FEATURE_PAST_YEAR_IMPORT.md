# 과거 연도 계획 가져오기 기능 구현 가이드

## 📋 개요

**목적**: 2026년 가치중심계획 수립 시, 과거 연도(2025, 2024 등)의 개인 미션, 핵심가치, 연간 목표를 선택적으로 가져올 수 있는 기능 구현

**대상 파일**: `client/src/pages/Foundation.tsx`

**구현 날짜**: 2025-10-12

---

## 🎯 요구사항

### 핵심 기능
1. ✅ 과거 연도의 Foundation & Goals 데이터 조회
2. ✅ 선택적 데이터 가져오기 (개인 미션, 핵심가치 1-3, 연간 목표)
3. ✅ 미리보기 기능 (선택 전 내용 확인)
4. ✅ 편집 모드에서만 사용 가능
5. ✅ 미래 연도 계획 수립 시에만 표시

### 사용자 시나리오
```
1. 사용자가 2026년 선택
2. "과거 계획 가져오기" 버튼 클릭
3. 다이얼로그에서 과거 연도 선택 (예: 2025년)
4. 2025년의 미션/가치/목표 미리보기
5. 원하는 항목만 체크박스로 선택
6. "가져오기" 클릭 → 2026년 입력 폼에 자동 입력
7. 필요시 수정 후 저장
```

---

## 🏗️ 아키텍처 설계

### 데이터 흐름
```
┌─────────────────────────────────────────────────────┐
│ Foundation.tsx (client/src/pages/Foundation.tsx)   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. 과거 연도 목록 조회                              │
│     GET /api/foundations/:userId                    │
│     → 모든 연도의 Foundation 반환                    │
│     → year < selectedYear 필터링                    │
│                                                     │
│  2. 선택한 연도 데이터 조회                          │
│     GET /api/foundation/:userId?year=YYYY           │
│     GET /api/goals/:userId?year=YYYY                │
│     → Foundation + Goals 병렬 조회                  │
│                                                     │
│  3. 데이터 임포트 실행                               │
│     - mission → setMission()                        │
│     - coreValues → setValues()                      │
│     - goals → setPendingGoals()                     │
│     → 기존 상태에 병합                               │
│                                                     │
│  4. 저장 실행                                        │
│     POST /api/foundation                            │
│     POST /api/goals (각 pending goal)               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📝 구현 단계

### **Step 1: 상태 관리 추가** (Foundation.tsx Line ~42)

기존 상태 변수 아래에 추가:

```typescript
// 기존 상태 (참고용)
const [selectedYear, setSelectedYear] = useState(currentYear);
const [mission, setMission] = useState("");
const [values, setValues] = useState(["", "", ""]);
const [newGoal, setNewGoal] = useState("");
const [isEditing, setIsEditing] = useState(false);
const [pendingGoals, setPendingGoals] = useState<any[]>([]);
const [deletedGoalIds, setDeletedGoalIds] = useState<Set<number>>(new Set());

// 🆕 추가할 상태
const [importDialog, setImportDialog] = useState({
  open: false,
  selectedYear: null as number | null,
  selectedMission: false,
  selectedValues: [false, false, false],
  selectedGoals: [] as number[], // goal IDs
});
```

---

### **Step 2: 과거 연도 목록 조회 쿼리** (Line ~120 근처, 기존 쿼리 아래)

```typescript
// 🆕 과거 Foundation이 있는 연도 목록 조회
const { data: availableYears = [] } = useQuery({
  queryKey: ['available-foundation-years', user?.id],
  queryFn: async () => {
    if (!user?.id) return [];
    const url = `/api/foundations/${user.id}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) return [];
    const foundations = await res.json();

    // 현재 선택된 연도보다 과거 연도만 필터링
    return foundations
      .map((f: any) => f.year)
      .filter((year: number) => year < selectedYear)
      .sort((a: number, b: number) => b - a); // 최신 연도부터
  },
  enabled: !!user?.id && !!accessToken && isFutureYear,
  staleTime: 10 * 60 * 1000, // 10분
});
```

---

### **Step 3: 선택한 연도의 데이터 조회 쿼리** (위 쿼리 바로 아래)

```typescript
// 🆕 선택한 과거 연도의 Foundation & Goals 조회
const { data: importPreview, isLoading: importPreviewLoading } = useQuery({
  queryKey: ['import-preview', user?.id, importDialog.selectedYear],
  queryFn: async () => {
    if (!importDialog.selectedYear || !user?.id) return null;

    const [foundationRes, goalsRes] = await Promise.all([
      fetchWithAuth(`/api/foundation/${user.id}?year=${importDialog.selectedYear}`),
      fetchWithAuth(`/api/goals/${user.id}?year=${importDialog.selectedYear}`),
    ]);

    const foundation = foundationRes.ok ? await foundationRes.json() : null;
    const goals = goalsRes.ok ? await goalsRes.json() : [];

    return { foundation, goals: Array.isArray(goals) ? goals : [] };
  },
  enabled: !!importDialog.selectedYear && !!user?.id && !!accessToken,
  staleTime: 5 * 60 * 1000,
});
```

---

### **Step 4: 임포트 실행 함수** (Line ~580 근처, handleCancelEdit 아래)

```typescript
// 🆕 과거 연도 데이터 임포트 실행
const handleImportFromPastYear = () => {
  if (!importPreview?.foundation) {
    toast({
      title: "데이터 없음",
      description: "선택한 연도의 계획이 없습니다.",
      variant: "destructive",
    });
    return;
  }

  const { foundation, goals: pastGoals } = importPreview;

  // 1. 개인 미션 복사
  if (importDialog.selectedMission && foundation.personalMission) {
    setMission(foundation.personalMission);
  }

  // 2. 핵심가치 복사
  const newValues = [...values];
  if (importDialog.selectedValues[0] && foundation.coreValue1) {
    newValues[0] = foundation.coreValue1;
  }
  if (importDialog.selectedValues[1] && foundation.coreValue2) {
    newValues[1] = foundation.coreValue2;
  }
  if (importDialog.selectedValues[2] && foundation.coreValue3) {
    newValues[2] = foundation.coreValue3;
  }
  setValues(newValues);

  // 3. 연간 목표 복사 (pending goals에 추가)
  const selectedGoalsData = pastGoals.filter((g: any) =>
    importDialog.selectedGoals.includes(g.id)
  );

  const importedGoals = selectedGoalsData.map((goal: any) => ({
    id: `pending-import-${Date.now()}-${Math.random()}`,
    title: goal.title,
    coreValue: goal.coreValue || "",
    isPending: true,
  }));

  setPendingGoals([...pendingGoals, ...importedGoals]);

  // 4. 다이얼로그 닫기 및 상태 초기화
  setImportDialog({
    open: false,
    selectedYear: null,
    selectedMission: false,
    selectedValues: [false, false, false],
    selectedGoals: [],
  });

  // 5. 편집 모드 활성화 (이미 활성화되어 있을 수 있음)
  setIsEditing(true);

  toast({
    title: "과거 계획 가져오기 완료",
    description: `${importDialog.selectedYear}년 계획에서 ${
      (importDialog.selectedMission ? 1 : 0) +
      importDialog.selectedValues.filter(Boolean).length +
      selectedGoalsData.length
    }개 항목을 가져왔습니다.`,
  });
};
```

---

### **Step 5: UI - 버튼 추가** (Line ~890, 기존 "수정" 버튼 근처)

```typescript
{/* 기존: Edit Button - Only show when not editing and not past year */}
{!isEditing && !isPastYear && (
  <Button
    onClick={() => setIsEditing(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0 px-4 py-2 h-auto font-medium text-sm"
  >
    <Edit2 className="h-4 w-4 mr-2" />
    수정
  </Button>
)}

{/* 🆕 추가: Import Button - 미래 연도이고 편집 모드일 때만 표시 */}
{isFutureYear && isEditing && availableYears.length > 0 && (
  <Button
    onClick={() => setImportDialog({ ...importDialog, open: true })}
    variant="outline"
    className="border-blue-300 text-blue-600 hover:bg-blue-50 shadow-sm px-4 py-2 h-auto font-medium text-sm"
  >
    <History className="h-4 w-4 mr-2" />
    과거 계획 가져오기
  </Button>
)}
```

**필요한 import 추가** (파일 최상단):
```typescript
import { History } from "lucide-react"; // 기존 import에 History 추가
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // 새로 추가
import { Badge } from "@/components/ui/badge"; // 새로 추가
```

---

### **Step 6: 다이얼로그 UI 구현** (Line ~1533, 삭제 확인 다이얼로그 아래)

```typescript
{/* 기존 Delete Confirmation Dialog */}
<Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
  {/* ... 기존 코드 ... */}
</Dialog>

{/* 🆕 과거 계획 가져오기 다이얼로그 */}
<Dialog open={importDialog.open} onOpenChange={(open) => setImportDialog({ ...importDialog, open })}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold">과거 계획 가져오기</DialogTitle>
      <DialogDescription>
        과거 연도의 개인 미션, 핵심가치, 연간 목표를 선택하여 {selectedYear}년 계획에 추가할 수 있습니다.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* 연도 선택 */}
      <div className="space-y-2">
        <Label htmlFor="import-year" className="text-sm font-medium">
          가져올 연도 선택
        </Label>
        <Select
          value={importDialog.selectedYear?.toString() || ""}
          onValueChange={(value) => setImportDialog({
            ...importDialog,
            selectedYear: parseInt(value),
            selectedMission: false,
            selectedValues: [false, false, false],
            selectedGoals: [],
          })}
        >
          <SelectTrigger id="import-year" className="w-full">
            <SelectValue placeholder="연도를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year: number) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 데이터 미리보기 및 선택 */}
      {importDialog.selectedYear && importPreview && (
        <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {importDialog.selectedYear}년 가치중심계획
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 개인 미션 */}
            {importPreview.foundation?.personalMission && (
              <div className="flex items-start space-x-3 p-3 bg-white/80 rounded-lg border border-slate-200">
                <Checkbox
                  id="import-mission"
                  checked={importDialog.selectedMission}
                  onCheckedChange={(checked) => setImportDialog({
                    ...importDialog,
                    selectedMission: !!checked,
                  })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="import-mission" className="font-medium text-sm cursor-pointer">
                    개인 미션
                  </Label>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {importPreview.foundation.personalMission}
                  </p>
                </div>
              </div>
            )}

            {/* 핵심가치 3개 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">핵심가치</Label>
              <div className="space-y-2">
                {[1, 2, 3].map((idx) => {
                  const coreValue = importPreview.foundation?.[`coreValue${idx}` as keyof typeof importPreview.foundation];
                  if (!coreValue) return null;

                  return (
                    <div key={idx} className="flex items-start space-x-3 p-3 bg-white/80 rounded-lg border border-slate-200">
                      <Checkbox
                        id={`import-value-${idx}`}
                        checked={importDialog.selectedValues[idx - 1]}
                        onCheckedChange={(checked) => {
                          const newSelectedValues = [...importDialog.selectedValues];
                          newSelectedValues[idx - 1] = !!checked;
                          setImportDialog({
                            ...importDialog,
                            selectedValues: newSelectedValues,
                          });
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`import-value-${idx}`} className="font-medium text-sm cursor-pointer">
                          핵심가치 {idx}
                        </Label>
                        <p className="text-sm text-slate-600 mt-1">
                          {coreValue as string}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 연간 목표 */}
            {importPreview.goals && importPreview.goals.length > 0 && (
              <div className="space-y-2">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="goals" className="border-none">
                    <AccordionTrigger className="py-2 px-3 bg-white/80 rounded-lg border border-slate-200 hover:no-underline hover:bg-white">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">연간 목표</span>
                        <Badge variant="secondary" className="text-xs">
                          {importPreview.goals.length}개
                        </Badge>
                        {importDialog.selectedGoals.length > 0 && (
                          <Badge className="text-xs bg-blue-600">
                            {importDialog.selectedGoals.length}개 선택
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {importPreview.goals.map((goal: any) => (
                          <div key={goal.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-slate-200">
                            <Checkbox
                              id={`import-goal-${goal.id}`}
                              checked={importDialog.selectedGoals.includes(goal.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setImportDialog({
                                    ...importDialog,
                                    selectedGoals: [...importDialog.selectedGoals, goal.id],
                                  });
                                } else {
                                  setImportDialog({
                                    ...importDialog,
                                    selectedGoals: importDialog.selectedGoals.filter((id) => id !== goal.id),
                                  });
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label htmlFor={`import-goal-${goal.id}`} className="font-medium text-sm cursor-pointer">
                                {goal.title}
                              </Label>
                              {goal.coreValue && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {goal.coreValue}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 로딩 상태 */}
      {importDialog.selectedYear && importPreviewLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-slate-600">데이터를 불러오는 중...</span>
        </div>
      )}

      {/* 데이터 없음 */}
      {importDialog.selectedYear && !importPreviewLoading && !importPreview?.foundation && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-500">
            {importDialog.selectedYear}년의 가치중심계획이 없습니다.
          </p>
        </div>
      )}
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setImportDialog({ ...importDialog, open: false })}
        className="border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        취소
      </Button>
      <Button
        onClick={handleImportFromPastYear}
        disabled={
          !importDialog.selectedYear ||
          (!importDialog.selectedMission &&
            !importDialog.selectedValues.some(Boolean) &&
            importDialog.selectedGoals.length === 0)
        }
        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        가져오기
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🧪 테스트 시나리오

### 테스트 1: 정상 동작
```
1. 2026년 선택
2. "과거 계획 가져오기" 버튼 클릭
3. 2025년 선택
4. 개인 미션 체크
5. 핵심가치 1, 2 체크
6. 연간 목표 3개 체크
7. "가져오기" 클릭
8. ✅ 입력 폼에 데이터 자동 입력 확인
9. 저장 버튼 클릭
10. ✅ 2026년 Foundation 생성 확인
```

### 테스트 2: 과거 연도 없음
```
1. 새 사용자로 2026년 선택
2. ❌ "과거 계획 가져오기" 버튼이 표시되지 않아야 함
   (availableYears.length === 0)
```

### 테스트 3: 부분 선택
```
1. 2026년 선택, 2025년 데이터 조회
2. 핵심가치 1만 체크
3. "가져오기" 클릭
4. ✅ 핵심가치 1만 입력되고 나머지는 빈 상태
```

### 테스트 4: 중복 가져오기
```
1. 2025년 데이터 가져오기 실행
2. 다시 "과거 계획 가져오기" 클릭
3. 2024년 데이터 가져오기 실행
4. ✅ Pending goals에 2025년 + 2024년 목표 모두 추가 확인
```

---

## 🐛 예상 이슈 및 해결

### Issue 1: Pending Goals 중복
**문제**: 같은 목표를 여러 번 가져올 수 있음
**해결**: 중복 체크 로직 추가
```typescript
// handleImportFromPastYear 함수 내
const existingTitles = new Set(pendingGoals.map(g => g.title));
const importedGoals = selectedGoalsData
  .filter((goal: any) => !existingTitles.has(goal.title))
  .map((goal: any) => ({ ... }));
```

### Issue 2: 핵심가치 불일치
**문제**: 2025년 목표의 coreValue가 2026년 핵심가치와 다름
**해결**: 경고 메시지 표시
```typescript
// 가져오기 전 검증
const importedCoreValues = selectedGoalsData
  .map((g: any) => g.coreValue)
  .filter(Boolean);

const mismatchedValues = importedCoreValues.filter(
  (cv: string) => !newValues.includes(cv)
);

if (mismatchedValues.length > 0) {
  toast({
    title: "핵심가치 불일치 경고",
    description: `일부 목표의 핵심가치(${mismatchedValues.join(', ')})가 현재 핵심가치와 다릅니다. 필요시 수정해주세요.`,
    variant: "warning",
  });
}
```

### Issue 3: API 에러 처리
**문제**: 네트워크 오류 시 빈 화면
**해결**: 에러 상태 표시
```typescript
const { data: importPreview, isLoading, error } = useQuery({ ... });

// 다이얼로그 내
{error && (
  <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
    <p className="text-sm text-red-600">
      데이터를 불러오는데 실패했습니다.
    </p>
  </div>
)}
```

---

## 📦 필요한 의존성

### 새로 추가할 컴포넌트 import
```typescript
// 기존 import에 추가
import { History } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
```

### 컴포넌트 파일 확인
- ✅ `@/components/ui/accordion` - Radix UI 기반 (이미 설치됨)
- ✅ `@/components/ui/badge` - Shadcn UI (이미 설치됨)
- ✅ `@/components/ui/checkbox` - Radix UI 기반 (이미 설치됨)

---

## 🚀 구현 순서 (Cursor Agent용)

### Phase 1: 기본 구조 (5분)
1. Foundation.tsx 열기
2. Line 42 근처: `importDialog` 상태 추가
3. Line 120 근처: `availableYears` 쿼리 추가
4. Line 130 근처: `importPreview` 쿼리 추가

### Phase 2: 로직 구현 (5분)
5. Line 580 근처: `handleImportFromPastYear` 함수 추가
6. 파일 최상단: History, Accordion, Badge import 추가

### Phase 3: UI 추가 (10분)
7. Line 890 근처: "과거 계획 가져오기" 버튼 추가
8. Line 1533 근처: 임포트 다이얼로그 UI 추가

### Phase 4: 테스트 (5분)
9. 브라우저에서 동작 확인
10. 에러 핸들링 추가

---

## 📊 구현 진행 상황 체크리스트

- [x] `importDialog` 상태 추가 (Line 48-55)
- [x] `availableYears` 쿼리 추가 (Line 130-147)
- [x] `importPreview` 쿼리 추가 (Line 150-167)
- [ ] `handleImportFromPastYear` 함수 추가 (다음 단계: Line 622 이후)
- [ ] 필요한 import 추가 (History, Accordion, Badge, Checkbox)
- [ ] "과거 계획 가져오기" 버튼 UI 추가 (Line 898 근처)
- [ ] 임포트 다이얼로그 UI 추가 (Line 1533 이후)
- [ ] 테스트 1: 정상 동작 확인
- [ ] 테스트 2: 과거 연도 없음 확인
- [ ] 테스트 3: 부분 선택 확인
- [ ] 에러 핸들링 추가

## 🔄 구현 재개 가이드 (토큰 초과 시)

### 현재 상태 (2025-10-12)
- ✅ Step 1-3 완료: 상태 관리 및 쿼리 추가 완료
- 🟡 Step 4: `handleImportFromPastYear` 함수 추가 필요
- 🟡 Step 5: import 추가 필요
- 🟡 Step 6-7: UI 추가 필요

### 다음 작업
1. Line 622 (`handleValueChange` 함수 아래)에 `handleImportFromPastYear` 함수 추가
2. Line 11 (파일 최상단 import)에 `History` 추가 from lucide-react
3. Line 10 (파일 최상단 import)에 Accordion, Badge, Checkbox 추가
4. Line 898 ("과거 계획 가져오기" 버튼 추가)
5. Line 1077 (Dialog 추가, 삭제 다이얼로그 아래)

---

## 🔗 관련 파일 및 참고사항

### 수정 대상 파일
- `client/src/pages/Foundation.tsx` (메인 구현)

### 참고할 기존 코드
- **삭제 확인 다이얼로그** (Line ~1509): Dialog 패턴 참고
- **Pending Goals 로직** (Line ~589): 목표 추가 로직 참고
- **연도 선택기** (Line ~846): Select 컴포넌트 사용법 참고

### API 엔드포인트 (이미 존재)
- `GET /api/foundations/:userId` - 모든 연도 조회
- `GET /api/foundation/:userId?year=YYYY` - 특정 연도 Foundation
- `GET /api/goals/:userId?year=YYYY` - 특정 연도 Goals

---

## 💡 향후 개선 아이디어

1. **연도별 비교 뷰**: 2025년 vs 2026년 side-by-side 비교
2. **목표 달성률 표시**: 과거 목표 선택 시 달성률 표시
3. **일괄 선택 버튼**: "모두 선택", "미션+가치 선택" 등
4. **드래그 앤 드롭**: 목표를 드래그로 순서 변경
5. **AI 추천**: 과거 성공률 높은 목표 우선 표시

---

## 📞 문제 발생 시

### 토큰 초과로 중단된 경우
1. 이 문서의 "구현 진행 상황 체크리스트" 확인
2. 완료된 항목은 건너뛰고 다음 단계부터 진행
3. "구현 순서" 섹션의 Phase 번호를 참고하여 이어서 진행

### 구현 중 막힌 경우
1. "예상 이슈 및 해결" 섹션 참고
2. "테스트 시나리오"로 동작 확인
3. 기존 코드 패턴 (삭제 다이얼로그, Pending Goals) 참고

---

## ✅ 완료 확인

구현 완료 후 다음을 확인하세요:

1. ✅ 2026년 선택 시 "과거 계획 가져오기" 버튼 표시
2. ✅ 버튼 클릭 시 다이얼로그 열림
3. ✅ 과거 연도 선택 가능
4. ✅ 선택한 연도의 데이터 미리보기 표시
5. ✅ 체크박스로 항목 선택 가능
6. ✅ "가져오기" 클릭 시 데이터 입력됨
7. ✅ 저장 시 2026년 Foundation 생성됨
8. ✅ 에러 상황에서 적절한 메시지 표시

---

**문서 작성일**: 2025-10-12
**최종 업데이트**: 2025-10-12
**작성자**: Claude (Sonnet 4.5)
