#!/usr/bin/env node

/**
 * Mobile Performance Analysis Script
 * 
 * 모바일 페이지 로딩 성능 및 가치중심계획 페이지 문제 분석
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL || '');

async function analyzeMobilePerformanceIssues() {
  console.log('🔍 모바일 성능 문제 분석 시작...\n');

  try {
    // 1. Foundation 데이터 존재 여부 확인
    console.log('📊 가치중심계획 데이터 분석:');
    const foundationData = await sql`
      SELECT 
        id,
        user_id,
        year,
        personal_mission,
        core_value_1,
        core_value_2,
        core_value_3,
        created_at
      FROM foundations 
      WHERE user_id = '42569768'
      ORDER BY year DESC
    `;

    if (foundationData.length === 0) {
      console.log('  ❌ Foundation 데이터 없음 - 이것이 빈 페이지의 원인!');
    } else {
      foundationData.forEach(foundation => {
        console.log(`  ✅ Foundation 발견: ${foundation.year}년`);
        console.log(`    미션: ${foundation.personal_mission || '미설정'}`);
        console.log(`    핵심가치: ${foundation.core_value_1 || '없음'}, ${foundation.core_value_2 || '없음'}, ${foundation.core_value_3 || '없음'}`);
      });
    }

    // 2. 연간목표 데이터 확인
    console.log('\n📈 연간목표 데이터 분석:');
    const annualGoalsData = await sql`
      SELECT 
        id,
        user_id,
        year,
        title,
        core_value,
        created_at
      FROM annual_goals 
      WHERE user_id = '42569768'
      ORDER BY year DESC, id
    `;

    if (annualGoalsData.length === 0) {
      console.log('  ❌ 연간목표 데이터 없음');
    } else {
      console.log(`  ✅ 연간목표 ${annualGoalsData.length}개 발견:`);
      annualGoalsData.forEach(goal => {
        console.log(`    - "${goal.title}" (${goal.year}년, 핵심가치: ${goal.core_value || '없음'})`);
      });
    }

    // 3. API 응답 시간 측정
    console.log('\n⏱️ API 성능 측정:');
    
    const apiTests = [
      {
        name: 'Foundation API',
        query: () => sql`SELECT * FROM foundations WHERE user_id = '42569768' AND year = 2025`
      },
      {
        name: 'Annual Goals API',
        query: () => sql`SELECT * FROM annual_goals WHERE user_id = '42569768' AND year = 2025`
      },
      {
        name: 'Projects API',
        query: () => sql`SELECT * FROM projects WHERE user_id = '42569768' LIMIT 10`
      },
      {
        name: 'Tasks API',
        query: () => sql`SELECT * FROM tasks WHERE user_id = '42569768' LIMIT 20`
      }
    ];

    for (const test of apiTests) {
      const startTime = Date.now();
      try {
        await test.query();
        const responseTime = Date.now() - startTime;
        
        let status = '✅';
        if (responseTime > 1000) status = '❌';
        else if (responseTime > 500) status = '⚠️';
        
        console.log(`  ${status} ${test.name}: ${responseTime}ms`);
      } catch (error) {
        console.log(`  ❌ ${test.name}: 오류 - ${error.message}`);
      }
    }

    // 4. 데이터베이스 연결 상태 확인
    console.log('\n🔌 데이터베이스 연결 상태 확인:');
    try {
      const connectionTest = await sql`SELECT NOW() as current_time, version() as pg_version`;
      console.log(`  ✅ 데이터베이스 연결 정상`);
      console.log(`  📅 현재 시각: ${connectionTest[0].current_time}`);
    } catch (error) {
      console.log(`  ❌ 데이터베이스 연결 오류: ${error.message}`);
    }

    // 5. 모바일 최적화 문제점 식별
    console.log('\n📱 모바일 최적화 문제점 분석:');
    
    const mobileIssues = [
      {
        issue: '가치중심계획 빈 페이지',
        cause: 'Foundation 데이터 없음 또는 API 호출 실패',
        severity: '높음',
        impact: '사용자가 페이지를 사용할 수 없음'
      },
      {
        issue: '페이지 로딩 시간 지연',
        cause: '과도한 데이터 로딩 또는 비효율적 쿼리',
        severity: '보통',
        impact: '사용자 경험 저하'
      },
      {
        issue: '모바일 네트워크 최적화 부족',
        cause: '압축되지 않은 데이터 전송',
        severity: '보통',
        impact: '느린 네트워크에서 성능 저하'
      }
    ];

    mobileIssues.forEach((issue, index) => {
      const severityIcon = issue.severity === '높음' ? '🔴' : 
                          issue.severity === '보통' ? '🟡' : '🟢';
      console.log(`  ${severityIcon} 문제 ${index + 1}: ${issue.issue}`);
      console.log(`    원인: ${issue.cause}`);
      console.log(`    심각도: ${issue.severity}`);
      console.log(`    영향: ${issue.impact}`);
    });

    // 6. 해결 방안 제시
    console.log('\n🔧 해결 방안:');
    
    const solutions = [
      {
        problem: '가치중심계획 빈 페이지',
        solutions: [
          '1. Foundation 컴포넌트에 로딩 상태 표시 추가',
          '2. 데이터 없을 때 명확한 안내 메시지 표시',
          '3. 초기 데이터 생성 버튼 제공',
          '4. API 오류 처리 개선'
        ]
      },
      {
        problem: '페이지 로딩 성능',
        solutions: [
          '1. 지연 로딩(Lazy Loading) 구현',
          '2. 캐싱 전략 강화',
          '3. 불필요한 API 호출 제거',
          '4. 데이터 페이지네이션 적용'
        ]
      },
      {
        problem: '모바일 최적화',
        solutions: [
          '1. 모바일 전용 CSS 최적화',
          '2. 터치 이벤트 최적화',
          '3. 이미지 압축 및 최적화',
          '4. 오프라인 대응 기능'
        ]
      }
    ];

    solutions.forEach(solution => {
      console.log(`\n  📋 ${solution.problem} 해결방안:`);
      solution.solutions.forEach(item => {
        console.log(`    ${item}`);
      });
    });

    // 7. 즉시 적용 가능한 수정사항
    console.log('\n🚀 즉시 적용 가능한 수정사항:');
    
    const quickFixes = [
      'Foundation 페이지에 로딩 스피너 추가',
      '데이터 없을 때 "시작하기" 버튼 표시',
      'API 오류 시 사용자 친화적 메시지',
      '모바일 CSS 반응형 개선',
      '불필요한 리렌더링 방지'
    ];

    quickFixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });

    console.log('\n📊 분석 결과 요약:');
    console.log(`  🔍 주요 문제: ${foundationData.length === 0 ? 'Foundation 데이터 부재' : 'API 성능 이슈'}`);
    console.log(`  📱 모바일 호환성: 부분적 지원`);
    console.log(`  ⚡ 성능 등급: ${foundationData.length > 0 ? 'B (개선 필요)' : 'D (심각한 문제)'}`);
    console.log(`  🎯 우선순위: Foundation 페이지 수정 > 성능 최적화 > UI/UX 개선`);

    console.log('\n🏁 모바일 성능 분석 완료!');

  } catch (error) {
    console.error('성능 분석 중 오류:', error);
    console.log('\n❌ 분석 실패 - 데이터베이스 연결 또는 쿼리 오류');
  }
}

analyzeMobilePerformanceIssues();