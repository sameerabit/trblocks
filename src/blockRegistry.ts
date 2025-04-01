
import {HelloWorld} from "./blocks/HelloWorld.tsx";
import * as React from "react";


export const BlockRegistry: Record<string, React.FC> = {
    "HelloWorld": HelloWorld,
}