# CSS to Material-UI Migration Guide

This document provides a step-by-step guide for migrating components from direct CSS to Material-UI's styling system. Follow these guidelines to ensure a consistent approach across all components.

## Migration Approach

We're using a hybrid approach that combines:

1. **Material-UI's styled API** - For simple container components and base styling
2. **makeStyles hook** - For complex selectors and nested styles
3. **Box component with system props** - For utility classes replacement
4. **ThemeProvider** - For consistent theming

## Migration Steps for Each Component

### 1. Analyze the Component

Before migrating, analyze the component's CSS:

```bash
# Run the CSS analysis script in your browser console
# This will identify all CSS classes used in the component
```

Use the analysis to categorize the styles:
- Layout styles (containers, positioning)
- Component styles (buttons, cards, etc.)
- Utility styles (margin, padding, etc.)
- Material-UI overrides (to be moved to theme)

### 2. Create Styled Components for Layout Elements

For container and layout elements, use Material-UI's styled API:

```javascript
// Before: CSS class
// .header {
//   position: relative;
//   background-color: var(--header-bg-color);
// }

// After: Styled Component
const HeaderRoot = styled('header')(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.palette.background.header,
  boxShadow: theme.custom.boxShadow,
  padding: '10px 20px',
}));
```

### 3. Use makeStyles for Complex Selectors

For elements with complex selectors, pseudo-classes, or nested elements, use makeStyles:

```javascript
// Before: CSS with nested selectors
// .main-nav {
//   display: flex;
// }
// .main-nav ul {
//   list-style: none;
// }
// .main-nav a:hover {
//   color: white;
// }

// After: makeStyles hook
const useStyles = makeStyles((theme) => ({
  mainNav: {
    display: 'flex',
    '& ul': {
      listStyle: 'none',
    },
    '& a:hover': {
      color: 'white',
    }
  }
}));
```

### 4. Replace Utility Classes with Box Props

Replace utility classes with Material-UI's Box component system props:

```jsx
// Before: Utility classes
// <div className="mt-3 p-2 d-flex align-items-center">

// After: Box props
<Box mt={3} p={2} display="flex" alignItems="center">
```

### 5. Move CSS Variables to Theme

Move CSS variables to the Material-UI theme configuration:

```javascript
// Before: CSS variables
// :root {
//   --primary-color: #4285f4;
//   --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
// }

// After: Theme configuration
const theme = createTheme({
  palette: {
    primary: { main: '#4285f4' },
  },
  custom: {
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  }
});
```

### 6. Replace Direct Material-UI Overrides with Theme Overrides

Move direct Material-UI CSS overrides to the theme's components section:

```javascript
// Before: CSS overrides
// .MuiTableCell-root {
//   color: var(--text-color-light);
// }

// After: Theme component overrides
const theme = createTheme({
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: '#f0f0f0',
        }
      }
    }
  }
});
```

## Example: Header Component Migration

The Header component has been migrated as an example. Here's how the migration was approached:

1. **Layout Elements**: Used styled API for the header container, content area, and navigation containers
2. **Navigation Items**: Used makeStyles for complex selectors like active states, hover effects
3. **Menu**: Replaced custom menu with Material-UI's Menu component
4. **Utility Classes**: Replaced with Box props for spacing, alignment
5. **CSS Variables**: Accessed from the theme

Key differences:
- Improved type safety with proper theme typing
- Better component composition
- Simplified responsive design with theme breakpoints
- More consistent styling across the application

## Testing Your Migration

After migrating a component:

1. Make sure it renders correctly in all supported browsers
2. Test responsive behavior at different screen sizes
3. Verify all interactive states (hover, focus, active)
4. Check for any CSS specificity issues that might cause styling conflicts

## Commit Guidelines

When committing a migrated component:

1. Use a descriptive commit message: `refactor: migrate [ComponentName] to Material-UI styling`
2. Include both the original and migrated files to make review easier
3. Update any imports in parent components
4. Document any changes to component props or behavior

## Migration Checklist

- [ ] Identify all CSS classes used by the component
- [ ] Create styled components for layout elements
- [ ] Use makeStyles for complex styling
- [ ] Replace utility classes with Box props
- [ ] Move CSS variables to theme access
- [ ] Test all visual states and responsiveness
- [ ] Update documentation and stories if applicable
- [ ] Remove unused CSS classes 