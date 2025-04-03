/*
 * CSS Analysis Script
 * This script helps identify and categorize CSS classes that need to be migrated to Material-UI.
 * 
 * To use:
 * 1. Run this script in the browser console from your app
 * 2. The script will output a report of CSS classes used in the application
 * 3. Use this report to prioritize which components to migrate first
 */

// Function to extract CSS classes from a CSS file
function extractCssClasses(cssText) {
  const classes = new Set();
  const regex = /\.([a-zA-Z0-9_-]+)(?![^{]*{[^{]*\.[a-zA-Z0-9_-])/g;
  let match;
  
  while ((match = regex.exec(cssText)) !== null) {
    // Exclude Material-UI classes (starting with Mui)
    if (!match[1].startsWith('Mui')) {
      classes.add(match[1]);
    }
  }
  
  return Array.from(classes);
}

// Function to find CSS classes used in the HTML
function findUsedClasses() {
  const allElements = document.querySelectorAll('*');
  const usedClasses = new Set();
  
  allElements.forEach(element => {
    const elementClasses = Array.from(element.classList || []);
    elementClasses.forEach(className => {
      // Exclude Material-UI classes (starting with Mui)
      if (!className.startsWith('Mui')) {
        usedClasses.add(className);
      }
    });
  });
  
  return Array.from(usedClasses);
}

// Function to categorize CSS classes into types
function categorizeClasses(classes) {
  const categories = {
    layout: [],
    component: [],
    utility: [],
    materialOverride: [],
    other: []
  };
  
  classes.forEach(className => {
    if (className.startsWith('app-') || 
        className.startsWith('container') || 
        className.startsWith('header') || 
        className.startsWith('footer')) {
      categories.layout.push(className);
    } else if (className.includes('-nav') || 
               className.includes('button') || 
               className.includes('card') || 
               className.includes('icon') || 
               className.includes('menu') || 
               className.includes('dialog') || 
               className.includes('table') || 
               className.includes('list')) {
      categories.component.push(className);
    } else if (className.startsWith('m-') || 
               className.startsWith('p-') || 
               className.startsWith('mt-') || 
               className.startsWith('mb-') || 
               className.startsWith('ml-') || 
               className.startsWith('mr-') || 
               className.startsWith('mx-') || 
               className.startsWith('my-') || 
               className.startsWith('pt-') || 
               className.startsWith('pb-') || 
               className.startsWith('pl-') || 
               className.startsWith('pr-') || 
               className.startsWith('px-') || 
               className.startsWith('py-') || 
               className.startsWith('d-') || 
               className.startsWith('text-') ||
               className.startsWith('flex-') ||
               className.startsWith('align-') ||
               className.startsWith('justify-')) {
      categories.utility.push(className);
    } else if (className.startsWith('Mui') || className.includes('Mui')) {
      categories.materialOverride.push(className);
    } else {
      categories.other.push(className);
    }
  });
  
  return categories;
}

// Main function to analyze CSS
function analyzeCss() {
  console.log('Starting CSS Analysis...');
  
  // Get all stylesheets
  const styleSheets = Array.from(document.styleSheets);
  let allCssClasses = [];
  
  // Extract classes from CSS files
  styleSheets.forEach(sheet => {
    try {
      // Check if it's a CSSStyleSheet and not from an external domain
      if (sheet.cssRules) {
        const rules = Array.from(sheet.cssRules);
        const cssText = rules.map(rule => rule.cssText).join('\n');
        const classes = extractCssClasses(cssText);
        allCssClasses = [...allCssClasses, ...classes];
      }
    } catch (e) {
      console.warn('Could not read stylesheet:', sheet.href, e);
    }
  });
  
  // Find used classes in the DOM
  const usedClasses = findUsedClasses();
  
  // Remove duplicates
  const uniqueClasses = [...new Set(allCssClasses)];
  
  // Categorize classes
  const categorizedClasses = categorizeClasses(uniqueClasses);
  
  // Analyze usage
  const usedClassSet = new Set(usedClasses);
  const unusedClasses = uniqueClasses.filter(className => !usedClassSet.has(className));
  
  // Generate report
  console.log('CSS Analysis Report:');
  console.log('===================');
  console.log('Total CSS Classes Defined:', uniqueClasses.length);
  console.log('Classes Currently Used in DOM:', usedClasses.length);
  console.log('Unused Classes:', unusedClasses.length);
  console.log('\nClass Categories:');
  console.log('Layout Classes:', categorizedClasses.layout.length);
  console.log('Component Classes:', categorizedClasses.component.length);
  console.log('Utility Classes:', categorizedClasses.utility.length);
  console.log('Material-UI Override Classes:', categorizedClasses.materialOverride.length);
  console.log('Other Classes:', categorizedClasses.other.length);
  
  console.log('\nDetailed Category Breakdown:');
  console.log('Layout Classes:', categorizedClasses.layout);
  console.log('Component Classes:', categorizedClasses.component);
  console.log('Utility Classes:', categorizedClasses.utility);
  console.log('Material-UI Override Classes:', categorizedClasses.materialOverride);
  console.log('Other Classes:', categorizedClasses.other);
  
  console.log('\nUnused Classes:');
  console.log(unusedClasses);
  
  // Return the analysis results
  return {
    totalClasses: uniqueClasses.length,
    usedClasses: usedClasses.length,
    unusedClasses: unusedClasses.length,
    categories: categorizedClasses,
    unusedClassList: unusedClasses
  };
}

// Run the analysis
const cssAnalysis = analyzeCss();
console.log('Analysis complete. Results stored in cssAnalysis variable.'); 