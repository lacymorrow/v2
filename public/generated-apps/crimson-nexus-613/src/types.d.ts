/// <reference types="vite/client" />

import "react";

declare module "react" {
    // Augment ReactNode to include bigint
    type ReactNode = ReactNode | bigint;
}

declare module "*.svg" {
    import * as React from "react";
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
    export default ReactComponent;
}

declare module "@radix-ui/react-icons" {
    import { ComponentProps, ForwardRefExoticComponent, RefAttributes } from "react";

    // Make IconProps more permissive by making all properties optional
    type IconProps = Partial<ComponentProps<"svg">> & {
        children?: React.ReactNode;
        className?: string;
        style?: React.CSSProperties;
    };

    // Make Icon type more flexible
    export type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

    // Add type declarations for each icon you use
    export const SunIcon: Icon;
    export const MoonIcon: Icon;
    export const ChevronDownIcon: Icon;
    export const ChevronRightIcon: Icon;
    export const DotsHorizontalIcon: Icon;
    export const ChevronLeftIcon: Icon;
    export const ArrowLeftIcon: Icon;
    export const ArrowRightIcon: Icon;
    export const CheckIcon: Icon;
    export const Cross2Icon: Icon;
    export const MagnifyingGlassIcon: Icon;
    export const DotFilledIcon: Icon;
    export const MinusIcon: Icon;
    export const ChevronUpIcon: Icon;
    export const ViewVerticalIcon: Icon;
    export const DragHandleDots2Icon: Icon;
}
