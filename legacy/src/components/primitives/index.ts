/**
 * Primitives library — Phase 11 DS panda + rouge fusée.
 * Toutes les primitives sont CVA-driven, tokens-only, accessible.
 * Cf. DESIGN-SYSTEM.md, COMPONENT-MAP.md.
 */

// Form
export { Button, buttonVariants, type ButtonProps } from "./button";
export { Input, inputVariants, type InputProps } from "./input";
export { Textarea, textareaVariants, type TextareaProps } from "./textarea";
export { Select, selectVariants, type SelectProps } from "./select";
export { Checkbox, type CheckboxProps } from "./checkbox";
export { Radio, type RadioProps } from "./radio";
export { Switch, type SwitchProps } from "./switch";
export { Label, type LabelProps } from "./label";
export { Field, FieldHelper, FieldError, useFieldContext, type FieldProps } from "./field";

// Display
export {
  Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter,
  cardVariants, type CardProps,
} from "./card";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Avatar, avatarVariants, type AvatarProps } from "./avatar";
export { Separator, type SeparatorProps } from "./separator";
export { Tag, type TagProps } from "./tag";

// Feedback
export { Alert, alertVariants, type AlertProps } from "./alert";
export { Banner, bannerVariants, type BannerProps } from "./banner";
export { Toast, toastVariants, type ToastProps } from "./toast";
export { Tooltip, type TooltipProps } from "./tooltip";
export { Popover, type PopoverProps } from "./popover";
export { Dialog, DialogFooter, dialogContentVariants, type DialogProps } from "./dialog";
export { Sheet, sheetVariants, type SheetProps } from "./sheet";

// Loading
export { Spinner, spinnerVariants, type SpinnerProps } from "./spinner";
export { Skeleton, skeletonVariants, type SkeletonProps } from "./skeleton";
export { Progress, type ProgressProps } from "./progress";

// Layout
export { Stack, type StackProps } from "./stack";
export { Grid, type GridProps } from "./grid";
export { Container, type ContainerProps } from "./container";

// Typography
export { Heading, headingVariants, type HeadingProps } from "./heading";
export { Text, textVariants, type TextProps } from "./text";

// Navigation
export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps } from "./tabs";
export { Accordion, AccordionItem, type AccordionItemProps } from "./accordion";
export { Breadcrumb, type BreadcrumbProps, type BreadcrumbItem } from "./breadcrumb";
export { Pagination, type PaginationProps } from "./pagination";
export { Stepper, type StepperProps, type StepperStep } from "./stepper";
export { Command, type CommandProps, type CommandItem } from "./command";

// Icons
export { Icon, type IconProps, type IconName } from "./icon";
