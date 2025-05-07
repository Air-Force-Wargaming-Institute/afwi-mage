export const reportTemplates = [
  {
    id: 'exec_summary',
    name: 'Executive Summary',
    description: 'A concise overview for decision-makers.',
    prebuiltElements: [
      { 
        title: 'Executive Summary',
        type: 'explicit', 
        format: 'h1',
        content: 'Executive Summary'
      },
      { 
        title: 'Key Points',
        type: 'explicit',
        format: 'h2',
        content: 'Key Points'
      },
      { 
        title: 'Key Points', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Main findings\nCritical issues\nRecommendations'
      },
      { 
        title: 'Background',
        type: 'explicit',
        format: 'h2',
        content: 'Background'
      },
      { 
        title: 'Background', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Brief context and purpose of the report'
      },
      { 
        title: 'Conclusions',
        type: 'explicit',
        format: 'h2',
        content: 'Conclusions'
      },
      { 
        title: 'Conclusions', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Key conclusions and next steps'
      }
    ]
  },

  {
    id: 'bbp',
    name: 'Bullet Background Paper (BBP)',
    description: 'A concise background paper with bullet points.',
    prebuiltElements: [
      { 
        title: 'Bullet Background Paper',
        type: 'explicit',
        format: 'h1',
        content: 'Bullet Background Paper'
      },
      { 
        title: 'Issue',
        type: 'explicit',
        format: 'h2',
        content: 'Issue'
      },
      { 
        title: 'Issue', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Clear statement of the issue'
      },
      { 
        title: 'Background',
        type: 'explicit',
        format: 'h2',
        content: 'Background'
      },
      { 
        title: 'Background', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Historical context\nCurrent situation\nKey stakeholders'
      },
      { 
        title: 'Analysis',
        type: 'explicit',
        format: 'h2',
        content: 'Analysis'
      },
      { 
        title: 'Analysis', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Key factors\nImplications\nRisks'
      }
    ]
  },

  {
    id: 'bp',
    name: 'Background Paper (BP)',
    description: 'A comprehensive background paper.',
    prebuiltElements: [
      { 
        title: 'Background Paper',
        type: 'explicit',
        format: 'h1',
        content: 'Background Paper'
      },
      { 
        title: 'Introduction',
        type: 'explicit',
        format: 'h2',
        content: 'Introduction'
      },
      { 
        title: 'Introduction', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Purpose and scope of the paper'
      },
      { 
        title: 'Historical Context',
        type: 'explicit',
        format: 'h2',
        content: 'Historical Context'
      },
      { 
        title: 'Historical Context', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Detailed historical background'
      },
      { 
        title: 'Current Situation',
        type: 'explicit',
        format: 'h2',
        content: 'Current Situation'
      },
      { 
        title: 'Current Situation', // Matches section title
        type: 'explicit',
        format: 'paragraph',
        content: 'Analysis of current circumstances'
      },
      { 
        title: 'Recommendations',
        type: 'explicit',
        format: 'h2',
        content: 'Recommendations'
      },
      { 
        title: 'Recommendations', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Proposed actions\nImplementation plan\nExpected outcomes'
      }
    ]
  },
  
  {
    id: 'tp',
    name: 'Talking Paper (TP)',
    description: 'A concise background paper with talking points.',
    prebuiltElements: [
      { 
        title: 'Talking Paper',
        type: 'explicit',
        format: 'h1',
        content: 'Talking Paper'
      },
      { 
        title: 'Key Messages',
        type: 'explicit',
        format: 'h2',
        content: 'Key Messages'
      },
      { 
        title: 'Key Messages', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Main points to convey\nSupporting evidence\nCall to action'
      },
      { 
        title: 'Talking Points',
        type: 'explicit',
        format: 'h2',
        content: 'Talking Points'
      },
      { 
        title: 'Talking Points', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Point 1 with supporting data\nPoint 2 with supporting data\nPoint 3 with supporting data'
      },
      { 
        title: 'Q&A Preparation',
        type: 'explicit',
        format: 'h2',
        content: 'Q&A Preparation'
      },
      { 
        title: 'Q&A Preparation', // Matches section title
        type: 'explicit',
        format: 'bulletList',
        content: 'Anticipated questions\nPrepared responses\nAdditional resources'
      }
    ]
  }
]; 