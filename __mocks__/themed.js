import React from "react";
import { Text, View } from "react-native";

export const ThemedText = (props) => <Text {...props}>{props.children}</Text>;
export const ThemedView = (props) => <View {...props}>{props.children}</View>;
