/// <reference types="vite/client" />

import "react";

declare module "react" {
    // Augment ReactNode to include bigint
    type ReactNode = ReactNode | bigint;
}
