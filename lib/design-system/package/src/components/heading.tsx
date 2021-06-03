import type * as Polymorphic from "@radix-ui/react-polymorphic";
import { config, styled } from "../core";
import type { CSS, ICSSProp, ExtractVariants } from "../types";

const DEFAULT_TAG = "h1";

const { fontSizes } = config.theme;
type TFontSizes = keyof typeof fontSizes;

const size = Object.keys(fontSizes).reduce(
  (acc, cv) => ({
    ...acc,
    [cv]: {
      fontSize: `$fontSizes$${cv}`,
      lineHeight: `$lineHeights$${cv}`,
    },
  }),
  {}
) as { [key in TFontSizes]: CSS };

export const Heading = styled(DEFAULT_TAG, {
  fontWeight: "$bold",
  variants: {
    size,
  },
  defaultVariants: {
    size: "2xl",
  },
});

export interface IHeadingProps
  extends ICSSProp,
    ExtractVariants<typeof Heading> {}

export type THeadingComponent = Polymorphic.ForwardRefComponent<
  typeof DEFAULT_TAG,
  IHeadingProps
>;
