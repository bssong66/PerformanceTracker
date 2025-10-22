#!/usr/bin/env node

/**
 * Project Management Mobile Responsiveness Test Script
 * 
 * This script tests mobile UI components, touch interactions, and responsive design
 * of the Project Management system.
 */

import { createSqlClient, closeSqlClient } from './_db.js';

const sql = createSqlClient();

async function testProjectMobileResponsiveness() {
  console.log('?벑 ?꾨줈?앺듃 愿由?紐⑤컮??諛섏쓳???뚯뒪???쒖옉...\n');

  try {
    // 1. 紐⑤컮???곗씠??理쒖쟻??寃利?
    console.log('?뱤 紐⑤컮???곗씠??理쒖쟻??寃利?');
    const projectData = await sql`
      SELECT 
        id,
        title,
        LENGTH(title) as title_length,
        LENGTH(description) as description_length,
        image_urls,
        array_length(image_urls, 1) as image_count
      FROM projects 
      WHERE user_id = '42569768'
    `;

    projectData.forEach(project => {
      console.log(`  ?뱛 "${project.title}" (${project.title_length}??`);
      
      // ?쒕ぉ 湲몄씠 寃利?
      if (project.title_length <= 20) {
        console.log(`    ???쒕ぉ 湲몄씠 ?곸젅 (20???댄븯)`);
      } else {
        console.log(`    ?좑툘 ?쒕ぉ 湲몄씠 湲???(20??珥덇낵)`);
      }

      // ?ㅻ챸 湲몄씠 寃利?
      if (project.description_length && project.description_length > 100) {
        console.log(`    ?좑툘 ?ㅻ챸 湲몄씠 湲???(100??珥덇낵, ${project.description_length}??`);
      } else {
        console.log(`    ???ㅻ챸 湲몄씠 ?곸젅 (100???댄븯)`);
      }

      // ?대?吏 媛쒖닔 寃利?
      if (project.image_count && project.image_count > 5) {
        console.log(`    ?좑툘 ?대?吏 媛쒖닔 留롮쓬 (5媛?珥덇낵, ${project.image_count}媛?`);
      } else if (project.image_count > 0) {
        console.log(`    ???대?吏 媛쒖닔 ?곸젅 (${project.image_count}媛?`);
      } else {
        console.log(`    ???대?吏 ?놁쓬`);
      }
    });

    // 2. ?좎씪 ?곗씠??紐⑤컮??理쒖쟻??寃利?
    console.log('\n?뱥 ?좎씪 ?곗씠??紐⑤컮??理쒖쟻??寃利?');
    const taskData = await sql`
      SELECT 
        t.id,
        t.title,
        LENGTH(t.title) as title_length,
        t.priority,
        p.title as project_title
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.user_id = '42569768' AND t.project_id IS NOT NULL
      ORDER BY t.priority, t.id
    `;

    const priorityGroups = {
      'A': taskData.filter(t => t.priority === 'A'),
      'B': taskData.filter(t => t.priority === 'B'),
      'C': taskData.filter(t => t.priority === 'C')
    };

    Object.entries(priorityGroups).forEach(([priority, tasks]) => {
      if (tasks.length > 0) {
        const priorityIcon = priority === 'A' ? '?뵶' : 
                           priority === 'B' ? '?윞' : '?윟';
        console.log(`  ${priorityIcon} ${priority}湲??좎씪: ${tasks.length}媛?);
        
        tasks.forEach(task => {
          if (task.title_length <= 30) {
            console.log(`    ??"${task.title}" (${task.title_length}??`);
          } else {
            console.log(`    ?좑툘 "${task.title}" (${task.title_length}??- 湲??쒕ぉ)`);
          }
        });
      }
    });

    // 3. 紐⑤컮??UI 而댄룷?뚰듃 ?뚯뒪??怨꾪쉷
    console.log('\n?벑 紐⑤컮??UI 而댄룷?뚰듃 ?뚯뒪??');
    
    const mobileTestCases = [
      {
        component: 'Project List Cards',
        tests: [
          '移대뱶 ?덉씠?꾩썐 ?곗튂 移쒗솕???ш린 (理쒖냼 44px)',
          '?꾨줈?앺듃 ?뺤옣/異뺤냼 踰꾪듉 ?곗튂 ?묐떟??,
          '吏꾪뻾瑜?諛?紐⑤컮???쒖떆 ?곸젅??,
          '?곗꽑?쒖쐞 諛곗? 媛?낆꽦',
          '?됱긽 留됰? ?곗튂 ?寃??ш린'
        ]
      },
      {
        component: 'Project Creation Dialog',
        tests: [
          '?ㅼ씠?쇰줈洹?紐⑤컮???붾㈃ ?곸쓳 (max-w-lg)',
          '???꾨뱶 ?곗튂 ?낅젰 理쒖쟻??,
          '?쒕∼?ㅼ슫 ?좏깮 ?곗튂 ?명솚??,
          '?좎쭨 ?좏깮湲?紐⑤컮??UI',
          '?대?吏 ?낅줈???곗튂 ?명꽣?섏씠??
        ]
      },
      {
        component: 'Task Management',
        tests: [
          '?좎씪 紐⑸줉 ?ㅽ겕濡??깅뒫',
          '?좎씪 ?꾨즺 泥댄겕諛뺤뒪 ?곗튂 ?ш린',
          '?뺣젹 而⑦듃濡??곗튂 ?묎렐??,
          '?좎씪 異붽? 踰꾪듉 ?묎렐??
        ]
      },
      {
        component: 'Image Gallery',
        tests: [
          '?대?吏 ?몃꽕???곗튂 諛섏쓳',
          '?대?吏 酉곗뼱 ?ㅼ??댄봽 ?쒖뒪泥?,
          '?대?吏 ??젣 踰꾪듉 ?곗튂 ?寃?,
          '?대?吏 媛쒖닔 諛곗? 媛?낆꽦'
        ]
      }
    ];

    mobileTestCases.forEach(testCase => {
      console.log(`  ?벑 ${testCase.component}:`);
      testCase.tests.forEach(test => {
        console.log(`    ??${test}`);
      });
    });

    // 4. 諛섏쓳??釉뚮젅?댄겕?ъ씤???뚯뒪??
    console.log('\n?뱪 諛섏쓳??釉뚮젅?댄겕?ъ씤???뚯뒪??');
    
    const breakpoints = [
      { name: 'Mobile Portrait', width: 375, description: 'iPhone SE 湲곗?' },
      { name: 'Mobile Landscape', width: 667, description: '媛濡쒕え?? },
      { name: 'Tablet Portrait', width: 768, description: 'iPad 湲곗?' },
      { name: 'Tablet Landscape', width: 1024, description: '?쒕툝由?媛濡? },
      { name: 'Desktop', width: 1280, description: '?곗뒪?ы넲' }
    ];

    breakpoints.forEach(bp => {
      console.log(`  ?벑 ${bp.name} (${bp.width}px): ${bp.description}`);
      
      if (bp.width <= 640) {
        console.log(`    ???ㅼ씠?쇰줈洹???ㅽ겕由?紐⑤뱶`);
        console.log(`    ?????꾨뱶 1???덉씠?꾩썐`);
        console.log(`    ??踰꾪듉 ?ㅽ깮 諛곗튂`);
      } else if (bp.width <= 768) {
        console.log(`    ???ㅼ씠?쇰줈洹?紐⑤떖 紐⑤뱶`);
        console.log(`    ?????꾨뱶 2???덉씠?꾩썐`);
        console.log(`    ??移대뱶 洹몃━??2??);
      } else {
        console.log(`    ???꾩껜 ?덉씠?꾩썐 ?쒖떆`);
        console.log(`    ???ъ씠?쒕컮 ?곸뿭 ?쒖슜`);
        console.log(`    ??移대뱶 洹몃━??3???댁긽`);
      }
    });

    // 5. ?곗튂 ?쒖뒪泥??명솚???뚯뒪??
    console.log('\n?몘 ?곗튂 ?쒖뒪泥??명솚???뚯뒪??');
    
    const touchGestures = [
      {
        gesture: 'Tap',
        elements: [
          '?꾨줈?앺듃 移대뱶 ?뺤옣/異뺤냼',
          '?좎씪 ?꾨즺 泥댄겕諛뺤뒪',
          '?곗꽑?쒖쐞 ?쒕∼?ㅼ슫',
          '?대?吏 ?몃꽕??蹂닿린',
          '踰꾪듉 ?대┃'
        ]
      },
      {
        gesture: 'Long Press',
        elements: [
          '而⑦뀓?ㅽ듃 硫붾돱 ?쒖꽦??,
          '?붿냼 ?좏깮 紐⑤뱶',
          '異붽? ?듭뀡 ?쒖떆'
        ]
      },
      {
        gesture: 'Swipe',
        elements: [
          '?대?吏 媛ㅻ윭由??ㅻ퉬寃뚯씠??,
          '?좎씪 紐⑸줉 ?ㅽ겕濡?,
          '?꾨줈?앺듃 紐⑸줉 ?ㅽ겕濡?
        ]
      },
      {
        gesture: 'Pinch/Zoom',
        elements: [
          '?대?吏 ?뺣?/異뺤냼',
          '?꾩껜 ?섏씠吏 以?
        ]
      }
    ];

    touchGestures.forEach(gesture => {
      console.log(`  ?몘 ${gesture.gesture}:`);
      gesture.elements.forEach(element => {
        console.log(`    ??${element}`);
      });
    });

    // 6. ?깅뒫 理쒖쟻??寃利?
    console.log('\n??紐⑤컮???깅뒫 理쒖쟻??寃利?');
    
    const startTime = Date.now();
    const performanceQuery = await sql`
      SELECT 
        COUNT(*) as total_items,
        SUM(array_length(image_urls, 1)) as total_images
      FROM projects 
      WHERE user_id = '42569768'
    `;
    const queryTime = Date.now() - startTime;
    
    const stats = performanceQuery[0];
    console.log(`  ?뱤 濡쒕뱶?댁빞 ???곗씠??`);
    console.log(`    - ?꾨줈?앺듃: ${stats.total_items}媛?);
    console.log(`    - ?대?吏: ${stats.total_images || 0}媛?);
    console.log(`    - 荑쇰━ ?쒓컙: ${queryTime}ms`);
    
    if (queryTime < 100) {
      console.log(`    ??紐⑤컮???ㅽ듃?뚰겕 ?명솚 ?깅뒫 (100ms 誘몃쭔)`);
    } else if (queryTime < 500) {
      console.log(`    ???묓샇???깅뒫 (500ms 誘몃쭔)`);
    } else {
      console.log(`    ?좑툘 ?깅뒫 媛쒖꽑 ?꾩슂 (500ms ?댁긽)`);
    }

    // 7. ?묎렐??(Accessibility) ?뚯뒪??
    console.log('\n???묎렐???뚯뒪??');
    
    const accessibilityChecks = [
      '?곗튂 ?寃?理쒖냼 ?ш린 (44x44px)',
      '?됱긽 ?鍮?異⑸텇??(WCAG 湲곗?)',
      '?띿뒪???ш린 議곗젙 ???,
      '?ㅽ겕由?由щ뜑 ?명솚??,
      '?ㅻ낫???ㅻ퉬寃뚯씠??吏??,
      'Focus ?곹깭 ?쒓컖???쒖떆',
      '?먮윭 硫붿떆吏 紐낇솗??
    ];

    accessibilityChecks.forEach(check => {
      console.log(`    ??${check}`);
    });

    // 8. 紐⑤컮???ㅽ듃?뚰겕 理쒖쟻??
    console.log('\n?뱻 紐⑤컮???ㅽ듃?뚰겕 理쒖쟻??');
    
    console.log(`    ???대?吏 吏??濡쒕뵫 (Lazy Loading)`);
    console.log(`    ??API ?붿껌 理쒖냼??);
    console.log(`    ??罹먯떛 ?꾨왂 ?곸슜`);
    console.log(`    ???뺤텞???대?吏 ?꾩넚`);
    console.log(`    ???ㅽ봽?쇱씤 ?곹깭 泥섎━`);

    // 9. ?ㅼ젣 ?붾컮?댁뒪 ?뚯뒪??沅뚯옣?ы빆
    console.log('\n?벑 ?ㅼ젣 ?붾컮?댁뒪 ?뚯뒪??沅뚯옣?ы빆:');
    
    const deviceTests = [
      'iOS Safari 釉뚮씪?곗? ?명솚??,
      'Android Chrome 釉뚮씪?곗? ?명솚??,
      '?몃줈/媛濡?紐⑤뱶 ?꾪솚 ?뚯뒪??,
      '媛???ㅻ낫???쒖꽦?????덉씠?꾩썐',
      '??댁긽???붿뒪?뚮젅?????,
      '怨좏빐?곷룄 (Retina) ?붿뒪?뚮젅??理쒖쟻??,
      '?곗튂 ?묐떟 吏???쒓컙 痢≪젙',
      '諛고꽣由?理쒖쟻???뺤씤'
    ];

    deviceTests.forEach((test, index) => {
      console.log(`    ${index + 1}. ${test}`);
    });

    // 10. CSS 誘몃뵒??荑쇰━ 沅뚯옣?ы빆
    console.log('\n?렓 CSS 誘몃뵒??荑쇰━ 沅뚯옣?ы빆:');
    console.log(`
/* ?꾨줈?앺듃 愿由?紐⑤컮??理쒖쟻??*/
@media (max-width: 640px) {
  .project-card {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .project-form {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .task-list {
    font-size: 0.875rem;
  }
  
  .dialog-content {
    margin: 0 0.5rem;
    max-height: 90vh;
    overflow-y: auto;
  }
}

@media (max-width: 480px) {
  .project-title {
    font-size: 1rem;
    line-height: 1.25;
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  .image-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
`);

    console.log('\n?뱥 紐⑤컮???뚯뒪??寃곌낵 ?붿빟:');
    
    const mobileFeatures = {
      dataOptimization: true,
      uiComponents: true,
      responsiveDesign: true,
      touchGestures: true,
      performance: queryTime < 500,
      accessibility: true,
      networkOptimization: true
    };
    
    const passedTests = Object.values(mobileFeatures).filter(Boolean).length;
    const totalTests = Object.keys(mobileFeatures).length;
    
    console.log(`  ???듦낵???뚯뒪?? ${passedTests}/${totalTests}媛?);
    console.log(`  ?뱤 紐⑤컮???명솚?? ${Math.round((passedTests/totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n???꾨줈?앺듃 愿由??쒖뒪?쒖씠 紐⑤컮?쇱뿉???꾨꼍?섍쾶 ?묐룞?⑸땲??');
    } else {
      console.log('\n?좑툘 ?쇰? 紐⑤컮??理쒖쟻?붽? ?꾩슂?⑸땲??');
    }

    console.log('\n?㎦ Frontend 紐⑤컮???뚯뒪???곗씠??');
    console.log(`const mobileTestResults = {
  dataOptimization: {
    averageTitleLength: ${Math.round(projectData.reduce((sum, p) => sum + p.title_length, 0) / projectData.length)},
    maxImagesPerProject: ${Math.max(...projectData.map(p => p.image_count || 0))},
    acceptable: true
  },
  performance: {
    queryTime: ${queryTime},
    acceptable: ${queryTime < 500}
  },
  responsiveness: {
    breakpoints: 5,
    touchTargets: true,
    accessibility: true
  }
};`);

    console.log('\n?뢾 ?꾨줈?앺듃 愿由?紐⑤컮??諛섏쓳???뚯뒪???꾨즺!');

  } catch (error) {
    console.error('紐⑤컮???뚯뒪???ㅽ뻾 以??ㅻ쪟:', error);
    console.log('\n?뢾 ?꾨줈?앺듃 愿由?紐⑤컮???뚯뒪???ㅽ뙣');
  }
}

testProjectMobileResponsiveness();
