#!/usr/bin/env node

/**
 * Mobile Performance Analysis Script
 * 
 * 紐⑤컮???섏씠吏 濡쒕뵫 ?깅뒫 諛?媛移섏쨷?ш퀎???섏씠吏 臾몄젣 遺꾩꽍
 */

import { createSqlClient, closeSqlClient } from './_db.js';

const sql = createSqlClient();

async function analyzeMobilePerformanceIssues() {
  console.log('?뵇 紐⑤컮???깅뒫 臾몄젣 遺꾩꽍 ?쒖옉...\n');

  try {
    // 1. Foundation ?곗씠??議댁옱 ?щ? ?뺤씤
    console.log('?뱤 媛移섏쨷?ш퀎???곗씠??遺꾩꽍:');
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
      console.log('  ??Foundation ?곗씠???놁쓬 - ?닿쾬??鍮??섏씠吏???먯씤!');
    } else {
      foundationData.forEach(foundation => {
        console.log(`  ??Foundation 諛쒓껄: ${foundation.year}??);
        console.log(`    誘몄뀡: ${foundation.personal_mission || '誘몄꽕??}`);
        console.log(`    ?듭떖媛移? ${foundation.core_value_1 || '?놁쓬'}, ${foundation.core_value_2 || '?놁쓬'}, ${foundation.core_value_3 || '?놁쓬'}`);
      });
    }

    // 2. ?곌컙紐⑺몴 ?곗씠???뺤씤
    console.log('\n?뱢 ?곌컙紐⑺몴 ?곗씠??遺꾩꽍:');
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
      console.log('  ???곌컙紐⑺몴 ?곗씠???놁쓬');
    } else {
      console.log(`  ???곌컙紐⑺몴 ${annualGoalsData.length}媛?諛쒓껄:`);
      annualGoalsData.forEach(goal => {
        console.log(`    - "${goal.title}" (${goal.year}?? ?듭떖媛移? ${goal.core_value || '?놁쓬'})`);
      });
    }

    // 3. API ?묐떟 ?쒓컙 痢≪젙
    console.log('\n?깍툘 API ?깅뒫 痢≪젙:');
    
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
        
        let status = '??;
        if (responseTime > 1000) status = '??;
        else if (responseTime > 500) status = '?좑툘';
        
        console.log(`  ${status} ${test.name}: ${responseTime}ms`);
      } catch (error) {
        console.log(`  ??${test.name}: ?ㅻ쪟 - ${error.message}`);
      }
    }

    // 4. ?곗씠?곕쿋?댁뒪 ?곌껐 ?곹깭 ?뺤씤
    console.log('\n?뵆 ?곗씠?곕쿋?댁뒪 ?곌껐 ?곹깭 ?뺤씤:');
    try {
      const connectionTest = await sql`SELECT NOW() as current_time, version() as pg_version`;
      console.log(`  ???곗씠?곕쿋?댁뒪 ?곌껐 ?뺤긽`);
      console.log(`  ?뱟 ?꾩옱 ?쒓컖: ${connectionTest[0].current_time}`);
    } catch (error) {
      console.log(`  ???곗씠?곕쿋?댁뒪 ?곌껐 ?ㅻ쪟: ${error.message}`);
    }

    // 5. 紐⑤컮??理쒖쟻??臾몄젣???앸퀎
    console.log('\n?벑 紐⑤컮??理쒖쟻??臾몄젣??遺꾩꽍:');
    
    const mobileIssues = [
      {
        issue: '媛移섏쨷?ш퀎??鍮??섏씠吏',
        cause: 'Foundation ?곗씠???놁쓬 ?먮뒗 API ?몄텧 ?ㅽ뙣',
        severity: '?믪쓬',
        impact: '?ъ슜?먭? ?섏씠吏瑜??ъ슜?????놁쓬'
      },
      {
        issue: '?섏씠吏 濡쒕뵫 ?쒓컙 吏??,
        cause: '怨쇰룄???곗씠??濡쒕뵫 ?먮뒗 鍮꾪슚?⑥쟻 荑쇰━',
        severity: '蹂댄넻',
        impact: '?ъ슜??寃쏀뿕 ???
      },
      {
        issue: '紐⑤컮???ㅽ듃?뚰겕 理쒖쟻??遺議?,
        cause: '?뺤텞?섏? ?딆? ?곗씠???꾩넚',
        severity: '蹂댄넻',
        impact: '?먮┛ ?ㅽ듃?뚰겕?먯꽌 ?깅뒫 ???
      }
    ];

    mobileIssues.forEach((issue, index) => {
      const severityIcon = issue.severity === '?믪쓬' ? '?뵶' : 
                          issue.severity === '蹂댄넻' ? '?윞' : '?윟';
      console.log(`  ${severityIcon} 臾몄젣 ${index + 1}: ${issue.issue}`);
      console.log(`    ?먯씤: ${issue.cause}`);
      console.log(`    ?ш컖?? ${issue.severity}`);
      console.log(`    ?곹뼢: ${issue.impact}`);
    });

    // 6. ?닿껐 諛⑹븞 ?쒖떆
    console.log('\n?뵩 ?닿껐 諛⑹븞:');
    
    const solutions = [
      {
        problem: '媛移섏쨷?ш퀎??鍮??섏씠吏',
        solutions: [
          '1. Foundation 而댄룷?뚰듃??濡쒕뵫 ?곹깭 ?쒖떆 異붽?',
          '2. ?곗씠???놁쓣 ??紐낇솗???덈궡 硫붿떆吏 ?쒖떆',
          '3. 珥덇린 ?곗씠???앹꽦 踰꾪듉 ?쒓났',
          '4. API ?ㅻ쪟 泥섎━ 媛쒖꽑'
        ]
      },
      {
        problem: '?섏씠吏 濡쒕뵫 ?깅뒫',
        solutions: [
          '1. 吏??濡쒕뵫(Lazy Loading) 援ы쁽',
          '2. 罹먯떛 ?꾨왂 媛뺥솕',
          '3. 遺덊븘?뷀븳 API ?몄텧 ?쒓굅',
          '4. ?곗씠???섏씠吏?ㅼ씠???곸슜'
        ]
      },
      {
        problem: '紐⑤컮??理쒖쟻??,
        solutions: [
          '1. 紐⑤컮???꾩슜 CSS 理쒖쟻??,
          '2. ?곗튂 ?대깽??理쒖쟻??,
          '3. ?대?吏 ?뺤텞 諛?理쒖쟻??,
          '4. ?ㅽ봽?쇱씤 ???湲곕뒫'
        ]
      }
    ];

    solutions.forEach(solution => {
      console.log(`\n  ?뱥 ${solution.problem} ?닿껐諛⑹븞:`);
      solution.solutions.forEach(item => {
        console.log(`    ${item}`);
      });
    });

    // 7. 利됱떆 ?곸슜 媛?ν븳 ?섏젙?ы빆
    console.log('\n?? 利됱떆 ?곸슜 媛?ν븳 ?섏젙?ы빆:');
    
    const quickFixes = [
      'Foundation ?섏씠吏??濡쒕뵫 ?ㅽ뵾??異붽?',
      '?곗씠???놁쓣 ??"?쒖옉?섍린" 踰꾪듉 ?쒖떆',
      'API ?ㅻ쪟 ???ъ슜??移쒗솕??硫붿떆吏',
      '紐⑤컮??CSS 諛섏쓳??媛쒖꽑',
      '遺덊븘?뷀븳 由щ젋?붾쭅 諛⑹?'
    ];

    quickFixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });

    console.log('\n?뱤 遺꾩꽍 寃곌낵 ?붿빟:');
    console.log(`  ?뵇 二쇱슂 臾몄젣: ${foundationData.length === 0 ? 'Foundation ?곗씠??遺?? : 'API ?깅뒫 ?댁뒋'}`);
    console.log(`  ?벑 紐⑤컮???명솚?? 遺遺꾩쟻 吏??);
    console.log(`  ???깅뒫 ?깃툒: ${foundationData.length > 0 ? 'B (媛쒖꽑 ?꾩슂)' : 'D (?ш컖??臾몄젣)'}`);
    console.log(`  ?렞 ?곗꽑?쒖쐞: Foundation ?섏씠吏 ?섏젙 > ?깅뒫 理쒖쟻??> UI/UX 媛쒖꽑`);

    console.log('\n?뢾 紐⑤컮???깅뒫 遺꾩꽍 ?꾨즺!');

  } catch (error) {
    console.error('?깅뒫 遺꾩꽍 以??ㅻ쪟:', error);
    console.log('\n??遺꾩꽍 ?ㅽ뙣 - ?곗씠?곕쿋?댁뒪 ?곌껐 ?먮뒗 荑쇰━ ?ㅻ쪟');
  }
}

analyzeMobilePerformanceIssues()
  .finally(async () => {
    await closeSqlClient(sql);
  });
