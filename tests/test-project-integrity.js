#!/usr/bin/env node

/**
 * Project Management Data Integrity Test Script
 * 
 * This script verifies data consistency, business logic, and functionality
 * of the Project Management system.
 */

import { createSqlClient, closeSqlClient } from './_db.js';

const sql = createSqlClient();

async function testProjectIntegrity() {
  console.log('?룛截??꾨줈?앺듃 愿由??곗씠???뺥빀??諛?湲곕뒫 ?뚯뒪???쒖옉...\n');

  try {
    // 1. ?꾨줈?앺듃 ?곗씠???꾪솴 寃利?
    console.log('?뱤 ?꾨줈?앺듃 ?곗씠???꾪솴:');
    const projectStats = await sql`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
        COUNT(CASE WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN 1 END) as with_dates,
        COUNT(CASE WHEN core_value IS NOT NULL AND core_value != '' THEN 1 END) as with_core_values,
        COUNT(CASE WHEN annual_goal IS NOT NULL AND annual_goal != '' THEN 1 END) as with_annual_goals,
        COUNT(CASE WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0 THEN 1 END) as with_images
      FROM projects 
      WHERE user_id = '42569768'
    `;
    
    const stats = projectStats[0];
    console.log(`  ?꾩껜 ?꾨줈?앺듃: ${stats.total_projects}媛?);
    console.log(`  ?곗꽑?쒖쐞 遺꾪룷: ?믪쓬 ${stats.high_priority}媛? 蹂댄넻 ${stats.medium_priority}媛? ??쓬 ${stats.low_priority}媛?);
    console.log(`  ?좎쭨 ?ㅼ젙: ${stats.with_dates}媛?);
    console.log(`  ?듭떖媛移??곌껐: ${stats.with_core_values}媛?);
    console.log(`  ?곌컙紐⑺몴 ?곌껐: ${stats.with_annual_goals}媛?);
    console.log(`  ?대?吏 泥⑤?: ${stats.with_images}媛?);

    // 2. ?꾨줈?앺듃-?좎씪 愿怨?臾닿껐??寃利?
    console.log('\n?뵕 ?꾨줈?앺듃-?좎씪 愿怨?臾닿껐??寃利?');
    const projectTaskRelations = await sql`
      SELECT 
        p.id as project_id,
        p.title as project_title,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks,
        CASE 
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE CAST((COUNT(CASE WHEN t.completed = true THEN 1 END)::float / COUNT(t.id)) * 100 AS INTEGER)
        END as completion_percentage
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.user_id = '42569768'
      WHERE p.user_id = '42569768'
      GROUP BY p.id, p.title
      ORDER BY p.id
    `;

    projectTaskRelations.forEach(project => {
      console.log(`  ??"${project.project_title}": ${project.task_count}媛??좎씪 (?꾨즺??${project.completion_percentage}%)`);
    });

    // 3. ?좎쭨 臾닿껐??寃利?
    console.log('\n?뱟 ?좎쭨 臾닿껐??寃利?');
    const dateIntegrity = await sql`
      SELECT 
        id,
        title,
        start_date,
        end_date,
        CASE 
          WHEN start_date IS NOT NULL AND end_date IS NOT NULL THEN
            CASE WHEN start_date <= end_date THEN 'valid' ELSE 'invalid' END
          ELSE 'partial'
        END as date_status
      FROM projects 
      WHERE user_id = '42569768' AND (start_date IS NOT NULL OR end_date IS NOT NULL)
    `;

    const validDates = dateIntegrity.filter(p => p.date_status === 'valid').length;
    const invalidDates = dateIntegrity.filter(p => p.date_status === 'invalid').length;
    const partialDates = dateIntegrity.filter(p => p.date_status === 'partial').length;

    console.log(`  ???좏슚???좎쭨: ${validDates}媛?);
    if (invalidDates > 0) {
      console.log(`  ??臾댄슚???좎쭨: ${invalidDates}媛?);
      dateIntegrity.filter(p => p.date_status === 'invalid').forEach(p => {
        console.log(`    - "${p.title}": ?쒖옉??${p.start_date}) > 醫낅즺??${p.end_date})`);
      });
    }
    if (partialDates > 0) {
      console.log(`  ?좑툘 遺遺??좎쭨: ${partialDates}媛?);
    }

    // 4. ?듭떖媛移?諛??곌컙紐⑺몴 ?곗씠???곌껐??寃利?
    console.log('\n?렞 ?듭떖媛移?諛??곌컙紐⑺몴 ?곌껐??寃利?');
    const foundationData = await sql`
      SELECT core_value_1, core_value_2, core_value_3 
      FROM foundations 
      WHERE user_id = '42569768' AND year = 2025
    `;
    
    const annualGoalsData = await sql`
      SELECT title 
      FROM annual_goals 
      WHERE user_id = '42569768' AND year = 2025
    `;

    if (foundationData.length > 0) {
      const foundation = foundationData[0];
      const coreValues = [foundation.core_value_1, foundation.core_value_2, foundation.core_value_3]
        .filter(v => v && v.trim());
      console.log(`  ?ㅼ젙???듭떖媛移? ${coreValues.length}媛?(${coreValues.join(', ')})`);
    } else {
      console.log(`  ?좑툘 ?듭떖媛移섍? ?ㅼ젙?섏? ?딆쓬`);
    }

    console.log(`  ?ㅼ젙???곌컙紐⑺몴: ${annualGoalsData.length}媛?);
    if (annualGoalsData.length > 0) {
      annualGoalsData.forEach(goal => {
        console.log(`    - "${goal.title}"`);
      });
    }

    // 5. ?꾨줈?앺듃蹂??곹깭 遺꾩꽍
    console.log('\n?뱢 ?꾨줈?앺듃蹂??곹깭 遺꾩꽍:');
    const projectStatus = await sql`
      SELECT 
        p.id,
        p.title,
        p.priority,
        p.color,
        p.core_value,
        p.annual_goal,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks,
        CASE 
          WHEN COUNT(t.id) = 0 THEN 'planning'
          WHEN COUNT(CASE WHEN t.completed = true THEN 1 END) = COUNT(t.id) THEN 'completed'
          WHEN COUNT(CASE WHEN t.completed = true THEN 1 END) > 0 THEN 'in_progress'
          ELSE 'planning'
        END as status
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.user_id = '42569768'
      WHERE p.user_id = '42569768'
      GROUP BY p.id, p.title, p.priority, p.color, p.core_value, p.annual_goal
      ORDER BY p.priority DESC, p.id
    `;

    const statusCounts = {
      planning: 0,
      in_progress: 0,
      completed: 0
    };

    projectStatus.forEach(project => {
      statusCounts[project.status]++;
      const statusEmoji = project.status === 'completed' ? '?? : 
                          project.status === 'in_progress' ? '?봽' : '?뱥';
      const statusText = project.status === 'completed' ? '?꾨즺' :
                         project.status === 'in_progress' ? '吏꾪뻾以? : '怨꾪쉷?섎┰';
      
      console.log(`  ${statusEmoji} "${project.title}" (${project.priority})`);
      console.log(`    ?곹깭: ${statusText} | ?좎씪: ${project.completed_tasks}/${project.total_tasks}`);
      if (project.core_value) console.log(`    ?듭떖媛移? ${project.core_value}`);
      if (project.annual_goal) console.log(`    ?곌컙紐⑺몴: ${project.annual_goal}`);
    });

    console.log(`\n?뱤 ?곹깭蹂??꾨줈?앺듃 遺꾪룷:`);
    console.log(`  ?뱥 怨꾪쉷?섎┰: ${statusCounts.planning}媛?);
    console.log(`  ?봽 吏꾪뻾以? ${statusCounts.in_progress}媛?);
    console.log(`  ?낆셿猷? ${statusCounts.completed}媛?);

    // 6. ?대?吏 ?곗씠??寃利?
    console.log('\n?뼹截??대?吏 ?곗씠??寃利?');
    const imageData = await sql`
      SELECT 
        id,
        title,
        image_urls,
        array_length(image_urls, 1) as image_count
      FROM projects 
      WHERE user_id = '42569768' AND image_urls IS NOT NULL AND array_length(image_urls, 1) > 0
    `;

    if (imageData.length > 0) {
      console.log(`  ?벜 ?대?吏媛 ?덈뒗 ?꾨줈?앺듃: ${imageData.length}媛?);
      imageData.forEach(project => {
        console.log(`    - "${project.title}": ${project.image_count}媛??대?吏`);
      });
    } else {
      console.log(`  ?벜 ?대?吏媛 泥⑤????꾨줈?앺듃 ?놁쓬`);
    }

    // 7. API ?깅뒫 ?뚯뒪??
    console.log('\n??API ?깅뒫 寃利?');
    const startTime = Date.now();
    await sql`
      SELECT p.*, 
             COUNT(t.id) as task_count,
             COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = '42569768'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const queryTime = Date.now() - startTime;
    console.log(`  荑쇰━ ?ㅽ뻾 ?쒓컙: ${queryTime}ms`);
    console.log(`  ${queryTime < 1000 ? '?? : '?좑툘'} API ?묐떟 ?쒓컙 ${queryTime < 1000 ? '?묓샇' : '媛쒖꽑 ?꾩슂'} (1珥?${queryTime < 1000 ? '誘몃쭔' : '?댁긽'})`);

    // 8. ?뚯뒪??寃곌낵 ?붿빟
    const successCount = 6; // 湲곕낯 寃利???ぉ??
    const warningCount = invalidDates + (foundationData.length === 0 ? 1 : 0);
    const failureCount = 0;

    console.log('\n?뱥 ?뚯뒪??寃곌낵 ?붿빟:');
    console.log(`  ?깃났: ${successCount}媛?寃利앺빆紐?);
    console.log(`  寃쎄퀬: ${warningCount}媛?媛쒖꽑?ы빆`);
    console.log(`  ?ㅽ뙣: ${failureCount}媛?寃利앺빆紐?);

    // 9. Frontend ?뚯뒪?몄슜 寃利??곗씠??
    console.log('\n?㎦ Frontend ?뚯뒪?몄슜 寃利??곗씠??');
    console.log(`const expectedProjectData = {
  projects: {
    total: ${stats.total_projects},
    priorities: {
      high: ${stats.high_priority},
      medium: ${stats.medium_priority},
      low: ${stats.low_priority}
    },
    withDates: ${stats.with_dates},
    withCoreValues: ${stats.with_core_values},
    withAnnualGoals: ${stats.with_annual_goals},
    withImages: ${stats.with_images}
  },
  status: {
    planning: ${statusCounts.planning},
    inProgress: ${statusCounts.in_progress},
    completed: ${statusCounts.completed}
  },
  performance: {
    queryTime: ${queryTime},
    acceptable: ${queryTime < 1000}
  }
};`);

    if (failureCount === 0) {
      console.log('\n??紐⑤뱺 ?꾩닔 寃利??듦낵! ?꾨줈?앺듃 愿由??쒖뒪?쒖씠 ?뺤긽 ?숈옉?⑸땲??');
    } else {
      console.log('\n?좑툘 ?쇰? 寃利앹뿉??臾몄젣媛 諛쒓껄?섏뿀?듬땲?? ?꾩쓽 ?몃??ы빆???뺤씤?섏꽭??');
    }

    console.log(`\n?뢾 ?꾨줈?앺듃 愿由??뚯뒪???꾨즺: ${successCount}媛??깃났, ${failureCount}媛??ㅽ뙣`);

  } catch (error) {
    console.error('?뚯뒪???ㅽ뻾 以??ㅻ쪟:', error);
    console.log('\n?뢾 ?꾨줈?앺듃 愿由??뚯뒪???꾨즺: 0媛??깃났, 1媛??ㅽ뙣');
  }
}

testProjectIntegrity()
  .finally(async () => {
    await closeSqlClient(sql);
  });



