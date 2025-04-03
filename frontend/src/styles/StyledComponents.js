import React from 'react';
import { makeStyles, styled } from '@material-ui/core/styles';
import { Paper, Box, Card, Container } from '@material-ui/core';

// Create a styled Container for page roots
export const StyledContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  position: 'relative',
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  maxWidth: '100%',
  minHeight: '100vh',
}));

// Create a styled Paper component with gradient border
export const GradientBorderPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  background: `${theme.custom.gradients.gradient1}`,
  border: `${theme.custom.borderWidth.hairline}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  boxShadow: theme.custom.boxShadow,
  transition: theme.custom.transition,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.hairline,
    left: theme.custom.borderWidth.hairline,
    right: theme.custom.borderWidth.hairline,
    bottom: theme.custom.borderWidth.hairline,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
    zIndex: 0,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover': {
    boxShadow: theme.custom.boxShadowLarge,
  }
}));

// Create a styled Paper with a subtle gradient glow using box-shadow instead of border
export const SubtleGlowPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  boxShadow: `
    0 4px 10px rgba(0, 0, 0, 0.3),
    0 0 0 1px ${theme.palette.background.paper},
    0 0 0 2px rgba(66, 134, 244, 0.3)
  `,
  transition: theme.custom.transition,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: theme.custom.gradients.gradient1,
    opacity: 0.2,
    zIndex: -1,
    pointerEvents: 'none',
  },
  '&:hover': {
    boxShadow: `
      0 6px 12px rgba(0, 0, 0, 0.4),
      0 0 0 1px ${theme.palette.background.paper},
      0 0 0 2px rgba(66, 134, 244, 0.5)
    `,
  }
}));

// Create a styled Paper with animated gradient border
export const AnimatedGradientPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `${theme.custom.borderWidth.regular}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    background: theme.custom.gradients.gradient2,
    animation: '$borderGlow 8s infinite alternate',
    borderRadius: theme.shape.borderRadius,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.regular,
    left: theme.custom.borderWidth.regular,
    right: theme.custom.borderWidth.regular,
    bottom: theme.custom.borderWidth.regular,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular/2,
    background: theme.palette.background.paper,
    zIndex: -1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
}));

// Create a styled Card with gradient border that animates on hover
export const GradientBorderCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  background: theme.custom.gradients.gradient1,
  border: `${theme.custom.borderWidth.hairline}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  boxShadow: theme.custom.boxShadow,
  transition: theme.custom.transition,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.hairline,
    left: theme.custom.borderWidth.hairline,
    right: theme.custom.borderWidth.hairline,
    bottom: theme.custom.borderWidth.hairline,
    background: theme.palette.background.card,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
    zIndex: 0,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.custom.boxShadowLarge,
    background: theme.custom.gradients.vibrant,
  }
}));

// Create a Paper with gradient corners
export const GradientCornersPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.custom.boxShadow,
  border: `${theme.custom.borderWidth.thin}px solid ${theme.palette.divider}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '30%',
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, transparent 60%)`,
    borderTopLeftRadius: theme.shape.borderRadius,
    opacity: 0.7,
    zIndex: 0,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '30%',
    height: '30%',
    background: `linear-gradient(315deg, ${theme.palette.primary.main} 0%, transparent 60%)`,
    borderBottomRightRadius: theme.shape.borderRadius,
    opacity: 0.7,
    zIndex: 0,
  }
}));

// Create a Box with gradient text
export const GradientText = styled(Box)(({ theme }) => ({
  background: theme.custom.gradients.horizontal,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  color: 'transparent',
  display: 'inline-block',
}));

// Create styles for container elements
export const useContainerStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    boxShadow: theme.custom.boxShadow,
    height: `calc(100vh - ${theme.spacing(19)}px)`,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    margin: '0 auto',
    position: 'relative',
    overflow: 'auto',
  },
  section: {
    marginBottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
  },
  sectionTitle: {
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
    fontSize: '1.5rem',
    fontWeight: 500,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.lighter,
  },
  infoBox: {
    position: 'relative',
    color: theme.palette.text.primary,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.custom.boxShadow,
    margin: theme.spacing(2, 0),
    background: theme.custom.gradients.horizontal,
    border: `${theme.custom.borderWidth.hairline}px solid transparent`,
    boxSizing: 'border-box',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.hairline,
      left: theme.custom.borderWidth.hairline,
      right: theme.custom.borderWidth.hairline,
      bottom: theme.custom.borderWidth.hairline,
      background: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.hairline/2,
      zIndex: 0,
    },
    '& > *': {
      position: 'relative',
      zIndex: 1
    }
  },
  dropzone: {
    border: `${theme.custom.borderWidth.regular}px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(4),
    textAlign: 'center',
    backgroundColor: theme.palette.background.paper,
    cursor: 'pointer',
    transition: theme.custom.transition,
    color: theme.palette.text.primary,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.background.lighter,
    },
    '&.active': {
      borderColor: theme.palette.primary.main,
    }
  },
  flexCenter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
}));

// HOC to apply gradient border to any component
export const withGradientBorder = (Component) => {
  return React.forwardRef((props, ref) => {
    const { style, borderWidth = 'regular', ...other } = props;
    const thickness = props.theme?.custom.borderWidth[borderWidth] || 3;
    
    const wrapperStyle = {
      ...style,
      position: 'relative',
      background: props.gradient || 'linear-gradient(to right, #4285f4, #34a853, #fbbc05)',
      border: `${thickness}px solid transparent`,
      borderRadius: props.theme?.shape.borderRadius || 10,
      padding: thickness,
      boxSizing: 'border-box',
    };
    
    return (
      <Box
        ref={ref}
        style={wrapperStyle}
        {...other}
      >
        <Box
          style={{
            position: 'absolute',
            top: thickness,
            left: thickness,
            right: thickness,
            bottom: thickness,
            background: props.theme?.palette.background.paper || 'rgba(30, 30, 30, 0.9)',
            borderRadius: (props.theme?.shape.borderRadius || 10) - thickness/2,
            zIndex: 0
          }}
        />
        <Box style={{ position: 'relative', zIndex: 1 }}>
          <Component {...other} />
        </Box>
      </Box>
    );
  });
};

// Create a high-contrast animated border paper for maximum visibility
export const HighContrastGradientPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `${theme.custom.borderWidth.extraThick}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  overflow: 'hidden',
  boxShadow: '0 6px 25px rgba(0, 0, 0, 0.7)',
  animation: '$pulseBorder 2s infinite',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    background: theme.custom.gradients.vibrant,
    animation: '$borderGlow 6s infinite alternate',
    borderRadius: theme.shape.borderRadius,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.extraThick,
    left: theme.custom.borderWidth.extraThick,
    right: theme.custom.borderWidth.extraThick,
    bottom: theme.custom.borderWidth.extraThick,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.extraThick/2,
    background: theme.palette.background.paper,
    zIndex: -1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
}));

// Create a styled component for side navigation with animated gradient border
export const AnimatedSideNav = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `${theme.custom.borderWidth.regular}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  overflow: 'hidden',
  width: 250,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    background: theme.custom.gradients.gradient2,
    animation: '$borderGlow 8s infinite alternate',
    borderRadius: theme.shape.borderRadius,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.regular,
    left: theme.custom.borderWidth.regular,
    right: theme.custom.borderWidth.regular,
    bottom: theme.custom.borderWidth.regular,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular/2,
    background: theme.palette.background.paper,
    zIndex: -1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
}));

// Create a styled component for content area with animated gradient border
export const AnimatedContentArea = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `${theme.custom.borderWidth.hairline}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  overflow: 'hidden',
  flex: 1,
  marginLeft: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    background: theme.custom.gradients.gradient1,
    animation: '$borderGlow 8s infinite alternate',
    borderRadius: theme.shape.borderRadius,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: theme.custom.borderWidth.regular,
    left: theme.custom.borderWidth.regular,
    right: theme.custom.borderWidth.regular,
    bottom: theme.custom.borderWidth.regular,
    borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular/2,
    background: theme.palette.background.paper,
    zIndex: -1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
})); 