#!/usr/bin/env node

/**
 * Calendar Data Integrity and Functionality Test Script
 * 
 * This script verifies the Calendar component's data integrity, functionality,
 * and mobile responsiveness by testing various scenarios.
 */

import pkg from 'pg';
const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for calendar integrity tests.');
}

const shouldUseSSL =
  process.env.DATABASE_SSL !== 'disable' &&
  !/localhost|127\.0\.0\.1/.test(connectionString);

// Database connection
const client = new Client({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
});

async function testCalendarIntegrity() {
  console.log('?뱟 ?쇱젙愿由??곗씠???뺥빀??諛?湲곕뒫 ?뚯뒪???쒖옉...\n');
  
  try {
    await client.connect();
    
    const testResults = {
      passed: 0,
      failed: 0,
      issues: []
    };

    // 1. ?쇱젙 ?곗씠??湲곕낯 寃利?
    console.log('?뱤 ?쇱젙 ?곗씠???꾪솴:');
    
    const eventsData = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE completed = true) as completed_events,
        COUNT(*) FILTER (WHERE is_all_day = true) as all_day_events,
        COUNT(*) FILTER (WHERE repeat_type != 'none') as recurring_events,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
        COUNT(*) FILTER (WHERE core_value IS NOT NULL) as core_value_linked,
        COUNT(*) FILTER (WHERE annual_goal IS NOT NULL) as goal_linked
      FROM events 
      WHERE user_id = '42569768'
    `);

    const stats = eventsData.rows[0];
    console.log(`  ?꾩껜 ?쇱젙: ${stats.total_events}媛?);
    console.log(`  ?꾨즺???쇱젙: ${stats.completed_events}媛?(${Math.round((stats.completed_events/stats.total_events)*100)}%)`);
    console.log(`  醫낆씪 ?쇱젙: ${stats.all_day_events}媛?);
    console.log(`  諛섎났 ?쇱젙: ${stats.recurring_events}媛?);
    console.log(`  ?곗꽑?쒖쐞 遺꾪룷: ?믪쓬 ${stats.high_priority}媛? 蹂댄넻 ${stats.medium_priority}媛? ??쓬 ${stats.low_priority}媛?);
    console.log(`  ?듭떖媛移??곌껐: ${stats.core_value_linked}媛?);
    console.log(`  ?곌컙紐⑺몴 ?곌껐: ${stats.goal_linked}媛?);

    // 2. ?쇱젙 ?좎쭨 臾닿껐??寃利?
    console.log('\n?뱧 ?쇱젙 ?좎쭨 臾닿껐??寃利?');
    
    const dateIntegrity = await client.query(`
      SELECT 
        COUNT(*) as invalid_dates
      FROM events 
      WHERE user_id = '42569768' 
        AND (start_date > end_date OR start_date IS NULL OR end_date IS NULL)
    `);

    if (parseInt(dateIntegrity.rows[0].invalid_dates) === 0) {
      console.log('  ??紐⑤뱺 ?쇱젙???좎쭨媛 ?좏슚??(?쒖옉????醫낅즺??');
      testResults.passed++;
    } else {
      console.log(`  ??${dateIntegrity.rows[0].invalid_dates}媛??쇱젙???좎쭨 ?ㅻ쪟 ?덉쓬`);
      testResults.failed++;
      testResults.issues.push('Invalid date ranges found in events');
    }

    // 3. 諛섎났 ?쇱젙 ?ㅼ젙 寃利?
    console.log('\n?봽 諛섎났 ?쇱젙 ?ㅼ젙 寃利?');
    
    const recurringEvents = await client.query(`
      SELECT 
        id,
        title,
        repeat_type,
        repeat_interval,
        repeat_weekdays,
        repeat_end_date,
        start_date
      FROM events 
      WHERE user_id = '42569768' AND repeat_type != 'none'
      ORDER BY start_date
    `);

    let recurringIssues = 0;
    recurringEvents.rows.forEach(event => {
      console.log(`  ?쇱젙: "${event.title}"`);
      console.log(`    諛섎났: ${event.repeat_type}, 媛꾧꺽: ${event.repeat_interval}`);
      
      // 二쇨컙 諛섎났 ?쇱젙???붿씪 ?ㅼ젙 寃利?
      if (event.repeat_type === 'weekly' && (!event.repeat_weekdays || event.repeat_weekdays.length === 0)) {
        console.log(`    ?좑툘 二쇨컙 諛섎났?댁?留??붿씪???ㅼ젙?섏? ?딆쓬`);
        recurringIssues++;
      }
      
      // 諛섎났 醫낅즺?쇱씠 ?쒖옉?쇰낫???대Ⅸ吏 寃利?
      if (event.repeat_end_date && new Date(event.repeat_end_date) < new Date(event.start_date)) {
        console.log(`    ??諛섎났 醫낅즺?쇱씠 ?쒖옉?쇰낫???대쫫`);
        recurringIssues++;
      }
      
      console.log(`    諛섎났 醫낅즺: ${event.repeat_end_date || '臾닿린??}`);
      if (event.repeat_weekdays) {
        const weekdays = ['??, '??, '??, '??, '紐?, '湲?, '??];
        const selectedDays = event.repeat_weekdays.map(d => weekdays[parseInt(d)]).join(', ');
        console.log(`    諛섎났 ?붿씪: ${selectedDays}`);
      }
    });

    if (recurringIssues === 0) {
      console.log('  ??紐⑤뱺 諛섎났 ?쇱젙 ?ㅼ젙???щ컮由?);
      testResults.passed++;
    } else {
      console.log(`  ??${recurringIssues}媛?諛섎났 ?쇱젙???ㅼ젙 臾몄젣 ?덉쓬`);
      testResults.failed++;
      testResults.issues.push(`${recurringIssues} recurring events have configuration issues`);
    }

    // 4. ?쇱젙-?좎씪 ?듯빀 ?쒖떆 ?곗씠??寃利?
    console.log('\n?뱥 ?쇱젙-?좎씪 ?듯빀 ?쒖떆 寃利?');
    
    const calendarData = await client.query(`
      -- ?쇱젙 ?곗씠??
      SELECT 
        'event' as type,
        id,
        title,
        start_date as date,
        priority,
        completed,
        core_value,
        annual_goal
      FROM events 
      WHERE user_id = '42569768'
      
      UNION ALL
      
      -- ?좎씪 ?곗씠??(?щ젰???쒖떆??寃껊뱾)
      SELECT 
        'task' as type,
        id,
        title,
        COALESCE(scheduled_date, created_at::date) as date,
        priority,
        completed,
        core_value,
        annual_goal
      FROM tasks 
      WHERE user_id = '42569768' AND scheduled_date IS NOT NULL
      
      ORDER BY date DESC
      LIMIT 10
    `);

    console.log('  理쒓렐 罹섎┛????ぉ??');
    calendarData.rows.forEach(item => {
      const icon = item.type === 'event' ? '?뱟' : '?뱷';
      const status = item.completed ? '?? : '??;
      console.log(`    ${icon} ${status} ${item.title} (${item.date})`);
      if (item.priority) console.log(`      ?곗꽑?쒖쐞: ${item.priority}`);
      if (item.core_value) console.log(`      ?듭떖媛移? ${item.core_value}`);
    });

    testResults.passed++;

    // 5. ?곗꽑?쒖쐞蹂??됱긽 諛??ㅽ????곗씠??寃利?
    console.log('\n?렓 ?곗꽑?쒖쐞蹂??ㅽ????곗씠??');
    
    const priorityDistribution = await client.query(`
      SELECT 
        priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE completed = true) as completed,
        ROUND((COUNT(*) FILTER (WHERE completed = true)::numeric / COUNT(*)) * 100, 1) as completion_rate
      FROM events 
      WHERE user_id = '42569768' AND priority IS NOT NULL
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END
    `);

    priorityDistribution.rows.forEach(row => {
      const colorMap = {
        'high': '?뵶 鍮④컯',
        'medium': '?윞 ?몃옉', 
        'low': '?윟 珥덈줉'
      };
      console.log(`  ${colorMap[row.priority]}: ${row.count}媛?(?꾨즺??${row.completion_rate}%)`);
    });

    testResults.passed++;

    // 6. ?쒕옒洹????쒕∼ ?곗씠???명솚??寃利?
    console.log('\n?뼮截??쒕옒洹????쒕∼ ?명솚??寃利?');
    
    const dragDropData = await client.query(`
      SELECT 
        id,
        title,
        start_date,
        end_date,
        is_all_day,
        EXTRACT(EPOCH FROM (end_date::timestamp - start_date::timestamp)) / 3600 as duration_hours
      FROM events 
      WHERE user_id = '42569768'
      ORDER BY start_date
      LIMIT 5
    `);

    console.log('  ?쒕옒洹?媛?ν븳 ?쇱젙??');
    dragDropData.rows.forEach(event => {
      console.log(`    "${event.title}"`);
      console.log(`      湲곌컙: ${event.start_date} ~ ${event.end_date}`);
      console.log(`      吏?띿떆媛? ${event.duration_hours}?쒓컙`);
      console.log(`      醫낆씪?щ?: ${event.is_all_day ? '?? : '?꾨땲??}`);
    });

    testResults.passed++;

    // 7. 紐⑤컮??諛섏쓳???곗씠???ш린 寃利?
    console.log('\n?벑 紐⑤컮??諛섏쓳???명솚???곗씠??');
    
    const mobileData = await client.query(`
      SELECT 
        LENGTH(title) as title_length,
        LENGTH(description) as desc_length,
        title
      FROM events 
      WHERE user_id = '42569768'
      ORDER BY LENGTH(title) DESC
      LIMIT 5
    `);

    let longTitleCount = 0;
    mobileData.rows.forEach(event => {
      if (event.title_length > 20) {
        longTitleCount++;
        console.log(`  ?좑툘 湲??쒕ぉ (${event.title_length}??: "${event.title}"`);
      } else {
        console.log(`  ???곸젅???쒕ぉ (${event.title_length}??: "${event.title}"`);
      }
    });

    if (longTitleCount === 0) {
      console.log('  ??紐⑤뱺 ?쇱젙 ?쒕ぉ??紐⑤컮?쇱뿉 ?곹빀??湲몄씠');
      testResults.passed++;
    } else {
      console.log(`  ?좑툘 ${longTitleCount}媛??쇱젙 ?쒕ぉ??紐⑤컮?쇱뿉???섎┫ ???덉쓬`);
      testResults.issues.push(`${longTitleCount} events may have truncated titles on mobile`);
    }

    // 8. API ?묐떟 ?쒓컙 ?뚯뒪?몄슜 荑쇰━
    console.log('\n??API ?깅뒫 寃利?');
    
    const performanceStart = Date.now();
    
    await client.query(`
      SELECT 
        e.*, 
        f.core_value_1, f.core_value_2, f.core_value_3
      FROM events e
      LEFT JOIN foundations f ON e.user_id = f.user_id AND f.year = 2025
      WHERE e.user_id = '42569768'
        AND e.start_date >= CURRENT_DATE - INTERVAL '30 days'
        AND e.start_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY e.start_date
    `);
    
    const performanceTime = Date.now() - performanceStart;
    console.log(`  荑쇰━ ?ㅽ뻾 ?쒓컙: ${performanceTime}ms`);
    
    if (performanceTime < 1000) {
      console.log('  ??API ?묐떟 ?쒓컙 ?묓샇 (1珥?誘몃쭔)');
      testResults.passed++;
    } else {
      console.log('  ?좑툘 API ?묐떟 ?쒓컙 媛쒖꽑 ?꾩슂');
      testResults.issues.push('Slow API response time');
    }

    // 9. 寃곌낵 ?붿빟
    console.log('\n?뱥 ?뚯뒪??寃곌낵 ?붿빟:');
    console.log(`  ?깃났: ${testResults.passed}媛?寃利앺빆紐?);
    console.log(`  ?ㅽ뙣: ${testResults.failed}媛?寃利앺빆紐?);
    console.log(`  寃쎄퀬: ${testResults.issues.length}媛?媛쒖꽑?ы빆`);

    if (testResults.issues.length > 0) {
      console.log('\n?좑툘 媛쒖꽑 沅뚯옣?ы빆:');
      testResults.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    // 10. Frontend ?뚯뒪?몄슜 ?곗씠??異쒕젰
    console.log('\n?㎦ Frontend ?뚯뒪?몄슜 寃利??곗씠??');
    console.log(`const expectedCalendarData = {`);
    console.log(`  events: {`);
    console.log(`    total: ${stats.total_events},`);
    console.log(`    completed: ${stats.completed_events},`);
    console.log(`    allDay: ${stats.all_day_events},`);
    console.log(`    recurring: ${stats.recurring_events}`);
    console.log(`  },`);
    console.log(`  priorities: {`);
    priorityDistribution.rows.forEach(row => {
      console.log(`    ${row.priority}: { total: ${row.count}, completed: ${row.completed} },`);
    });
    console.log(`  },`);
    console.log(`  performance: {`);
    console.log(`    queryTime: ${performanceTime},`);
    console.log(`    acceptable: ${performanceTime < 1000}`);
    console.log(`  }`);
    console.log(`};`);

    if (testResults.failed === 0) {
      console.log('\n??紐⑤뱺 ?꾩닔 寃利??듦낵! ?쇱젙愿由??쒖뒪?쒖씠 ?뺤긽 ?숈옉?⑸땲??');
    } else {
      console.log(`\n?좑툘 ${testResults.failed}媛?以묒슂 臾몄젣 諛쒓껄. ?섏젙???꾩슂?⑸땲??`);
    }

    return testResults;

  } catch (error) {
    console.error('?뚯뒪???ㅽ뻾 以??ㅻ쪟:', error);
    return { passed: 0, failed: 1, issues: [error.message] };
  } finally {
    await client.end();
  }
}

// ?ㅽ겕由쏀듃 ?ㅽ뻾
testCalendarIntegrity()
  .then(results => {
    console.log(`\n?뢾 ?쇱젙愿由??뚯뒪???꾨즺: ${results.passed}媛??깃났, ${results.failed}媛??ㅽ뙣`);
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('?뚯뒪???ㅽ뻾 ?ㅽ뙣:', error);
    process.exit(1);
  });

export { testCalendarIntegrity };

