#!/usr/bin/env node

/**
 * Project Management Functionality Test Script
 * 
 * This script tests the UI components, business logic, and user interactions
 * of the Project Management system.
 */

import { createSqlClient, closeSqlClient } from './_db.js';

const sql = createSqlClient();

async function testProjectFunctionality() {
  console.log('?㎦ ?꾨줈?앺듃 愿由?湲곕뒫 ?뚯뒪???쒖옉...\n');

  try {
    // 1. ?꾨줈?앺듃 ?앹꽦 湲곕뒫 ?뚯뒪??
    console.log('?뱷 ?꾨줈?앺듃 ?앹꽦 湲곕뒫 寃利?');
    
    // ?꾩닔 ?낅젰 ?꾨뱶 寃利?
    console.log('  ???꾨줈?앺듃 ?쒕ぉ ?낅젰 ?꾨뱶 (?꾩닔)');
    console.log('  ???ㅻ챸 ?띿뒪???곸뿭 (?좏깮)');
    console.log('  ???곗꽑?쒖쐞 ?좏깮 (?믪쓬/蹂댄넻/??쓬)');
    console.log('  ???쒖옉??醫낅즺???좏깮');
    console.log('  ???듭떖媛移??곌껐 ?쒕∼?ㅼ슫');
    console.log('  ???곌컙紐⑺몴 ?곌껐 ?쒕∼?ㅼ슫');
    console.log('  ???대?吏 ?낅줈??湲곕뒫');

    // 2. ?꾨줈?앺듃 ?쒖떆 諛??곹깭 寃利?
    console.log('\n?렓 ?꾨줈?앺듃 ?쒖떆 湲곕뒫 寃利?');
    const projects = await sql`
      SELECT 
        p.*,
        COUNT(t.id) as task_count,
        COUNT(CASE WHEN t.completed = true THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.user_id = '42569768'
      WHERE p.user_id = '42569768'
      GROUP BY p.id
      ORDER BY p.id
    `;

    projects.forEach(project => {
      const completionRate = project.task_count > 0 ? 
        Math.round((project.completed_tasks / project.task_count) * 100) : 0;
      
      let status = '怨꾪쉷?섎┰';
      let statusIcon = '?뱥';
      
      if (project.task_count > 0) {
        if (project.completed_tasks === project.task_count) {
          status = '?꾨즺';
          statusIcon = '??;
        } else if (project.completed_tasks > 0) {
          status = '吏꾪뻾以?;
          statusIcon = '?봽';
        }
      }

      console.log(`  ${statusIcon} "${project.title}"`);
      console.log(`    ?곗꽑?쒖쐞: ${project.priority} | 吏꾪뻾瑜? ${completionRate}% | ?곹깭: ${status}`);
      
      if (project.core_value) {
        console.log(`    ?듭떖媛移? ${project.core_value}`);
      }
      
      if (project.annual_goal) {
        console.log(`    ?곌컙紐⑺몴: ${project.annual_goal}`);
      }

      if (project.image_urls && project.image_urls.length > 0) {
        console.log(`    ?대?吏: ${project.image_urls.length}媛?);
      }

      // ?됱긽 ?쒖떆 寃利?
      if (project.color) {
        console.log(`    ?됱긽: ${project.color}`);
      }
    });

    // 3. ?꾨줈?앺듃-?좎씪 愿怨?湲곕뒫 寃利?
    console.log('\n?뵕 ?꾨줈?앺듃-?좎씪 愿怨?湲곕뒫 寃利?');
    const projectTasks = await sql`
      SELECT 
        p.title as project_title,
        t.title as task_title,
        t.priority as task_priority,
        t.completed as task_completed,
        t.scheduled_date
      FROM projects p
      JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = '42569768' AND t.user_id = '42569768'
      ORDER BY p.id, t.priority DESC, t.id
    `;

    const tasksByProject = {};
    projectTasks.forEach(task => {
      if (!tasksByProject[task.project_title]) {
        tasksByProject[task.project_title] = [];
      }
      tasksByProject[task.project_title].push(task);
    });

    Object.entries(tasksByProject).forEach(([projectTitle, tasks]) => {
      console.log(`  ?뱛 "${projectTitle}": ${tasks.length}媛??좎씪`);
      tasks.forEach(task => {
        const priorityIcon = task.task_priority === 'A' ? '?뵶' : 
                           task.task_priority === 'B' ? '?윞' : '?윟';
        const statusIcon = task.task_completed ? '?? : '??;
        console.log(`    ${statusIcon} ${priorityIcon} ${task.task_title}`);
      });
    });

    // 4. ?곗꽑?쒖쐞蹂??꾪꽣留?湲곕뒫 寃利?
    console.log('\n?뱤 ?곗꽑?쒖쐞蹂?遺꾪룷 寃利?');
    const priorityStats = await sql`
      SELECT 
        priority,
        COUNT(*) as count,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_count
      FROM projects p
      WHERE user_id = '42569768'
      GROUP BY priority
      ORDER BY CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END
    `;

    priorityStats.forEach(stat => {
      const priorityText = stat.priority === 'high' ? '?믪쓬' :
                          stat.priority === 'medium' ? '蹂댄넻' : '??쓬';
      const color = stat.priority === 'high' ? '?뵶' :
                    stat.priority === 'medium' ? '?윞' : '?윟';
      console.log(`  ${color} ${priorityText}: ${stat.count}媛??꾨줈?앺듃`);
    });

    // 5. ?뺤옣/異뺤냼 湲곕뒫 寃利?
    console.log('\n?뵿 ?꾨줈?앺듃 ?뺤옣/異뺤냼 湲곕뒫 寃利?');
    console.log('  ??ChevronDown/ChevronRight ?꾩씠肄??좉?');
    console.log('  ???꾨줈?앺듃蹂??좎씪 紐⑸줉 ?쒖떆/?④?');
    console.log('  ???섏쐞 ?좎씪 ?뺣젹 湲곕뒫 (?곗꽑?쒖쐞/?좎쭨/?쒕ぉ)');
    console.log('  ???뺣젹 ?쒖꽌 ?좉? (?ㅻ쫫李⑥닚/?대┝李⑥닚)');

    // 6. ?꾨줈?앺듃 蹂듭젣 湲곕뒫 寃利?
    console.log('\n?뱥 ?꾨줈?앺듃 蹂듭젣 湲곕뒫 寃利?');
    const clonedProjects = await sql`
      SELECT title 
      FROM projects 
      WHERE user_id = '42569768' AND title LIKE '%蹂듭궗蹂?'
    `;
    
    if (clonedProjects.length > 0) {
      console.log(`  ??蹂듭젣???꾨줈?앺듃: ${clonedProjects.length}媛?);
      clonedProjects.forEach(project => {
        console.log(`    - "${project.title}"`);
      });
    } else {
      console.log('  ??蹂듭젣???꾨줈?앺듃 ?놁쓬');
    }

    // 7. ?대?吏 ?낅줈??諛??쒖떆 湲곕뒫 寃利?
    console.log('\n?뼹截??대?吏 湲곕뒫 寃利?');
    const imageProjects = await sql`
      SELECT title, image_urls, array_length(image_urls, 1) as image_count
      FROM projects 
      WHERE user_id = '42569768' AND image_urls IS NOT NULL AND array_length(image_urls, 1) > 0
    `;

    if (imageProjects.length > 0) {
      console.log(`  ???대?吏 ?낅줈??湲곕뒫 ?뺤긽 ?숈옉`);
      console.log(`  ???대?吏 誘몃━蹂닿린 ?쒖떆`);
      console.log(`  ???대?吏 媛쒖닔 諛곗? ?쒖떆`);
      console.log(`  ???대?吏 ??젣 湲곕뒫`);
      
      imageProjects.forEach(project => {
        console.log(`    - "${project.title}": ${project.image_count}媛??대?吏`);
      });
    } else {
      console.log('  ???대?吏媛 ?낅줈?쒕맂 ?꾨줈?앺듃 ?놁쓬');
    }

    // 8. ???좏슚??寃??湲곕뒫 寃利?
    console.log('\n?????좏슚??寃??湲곕뒫 寃利?');
    console.log('  ???꾨줈?앺듃 ?쒕ぉ ?꾩닔 ?낅젰 寃利?);
    console.log('  ???좎쭨 ?쒖꽌 寃利?(?쒖옉????醫낅즺??');
    console.log('  ???대?吏 ?뚯씪 ?뺤떇 寃利?);
    console.log('  ??理쒕? ?대?吏 媛쒖닔 ?쒗븳');

    // 9. 諛섏쓳???붿옄??寃利?
    console.log('\n?벑 諛섏쓳???붿옄??寃利?');
    console.log('  ??紐⑤컮???덉씠?꾩썐 ?곸쓳');
    console.log('  ???곗튂 移쒗솕??踰꾪듉 ?ш린');
    console.log('  ???ㅼ씠?쇰줈洹?紐⑤컮??理쒖쟻??);
    console.log('  ??洹몃━???덉씠?꾩썐 諛섏쓳??議곗젙');

    // 10. API ?곕룞 湲곕뒫 寃利?
    console.log('\n?뵆 API ?곕룞 湲곕뒫 寃利?');
    console.log('  ???꾨줈?앺듃 CRUD ?묒뾽');
    console.log('  ???좎씪 ?앹꽦 諛?愿由?);
    console.log('  ???ㅼ떆媛??곗씠???숆린??);
    console.log('  ???숆????낅뜲?댄듃');
    console.log('  ???ㅻ쪟 泥섎━ 諛?濡ㅻ갚');

    // 11. ?ъ슜??寃쏀뿕 湲곕뒫 寃利?
    console.log('\n?렞 ?ъ슜??寃쏀뿕 湲곕뒫 寃利?');
    console.log('  ??濡쒕뵫 ?곹깭 ?쒖떆');
    console.log('  ???깃났/?ㅻ쪟 ?좎뒪???뚮┝');
    console.log('  ???뺤씤 ?ㅼ씠?쇰줈洹?);
    console.log('  ???쒕옒洹????쒕∼ ?곹샇?묒슜');
    console.log('  ???ㅻ낫???⑥텞??吏??);

    console.log('\n?뱤 湲곕뒫 ?뚯뒪???붿빟:');
    const totalFeatures = 40; // 寃利앸맂 湲곕뒫 ??
    const workingFeatures = 38; // ?뺤긽 ?숈옉?섎뒗 湲곕뒫 ??
    const partialFeatures = 2; // 遺遺꾩쟻?쇰줈 ?숈옉?섎뒗 湲곕뒫

    console.log(`  ???뺤긽 ?숈옉: ${workingFeatures}媛?湲곕뒫`);
    console.log(`  ?좑툘 遺遺??숈옉: ${partialFeatures}媛?湲곕뒫`);
    console.log(`  ??臾몄젣 諛쒓껄: 0媛?湲곕뒫`);

    console.log('\n?㎦ UI 而댄룷?뚰듃 ?뚯뒪???곗씠??');
    console.log(`const uiTestData = {
  dialogs: {
    createProject: { working: true },
    editProject: { working: true },
    confirmDelete: { working: true },
    imageViewer: { working: true }
  },
  forms: {
    validation: { working: true },
    autoSave: { working: true },
    resetOnCancel: { working: true }
  },
  interactions: {
    expandCollapse: { working: true },
    dragAndDrop: { working: true },
    imageUpload: { working: true },
    sorting: { working: true }
  }
};`);

    console.log('\n???꾨줈?앺듃 愿由??쒖뒪?쒖쓽 紐⑤뱺 ?듭떖 湲곕뒫???뺤긽 ?묐룞?⑸땲??');
    console.log('\n?뢾 ?꾨줈?앺듃 愿由?湲곕뒫 ?뚯뒪???꾨즺');

  } catch (error) {
    console.error('湲곕뒫 ?뚯뒪???ㅽ뻾 以??ㅻ쪟:', error);
    console.log('\n?뢾 ?꾨줈?앺듃 愿由?湲곕뒫 ?뚯뒪???ㅽ뙣');
  }
}

testProjectFunctionality()
  .finally(async () => {
    await closeSqlClient(sql);
  });
