export const changeScale = ({ detail }) => {
  const { leftBorder, widthColumnMap, ratioMap } = detail;

  const widthColumn = 1000 / ratioMap;
  const position = (-leftBorder * widthColumn) / widthColumnMap - 5 * widthColumnMap;
  const newRatio = widthColumn / widthColumnMap;

  return { newRatio, position, column: widthColumn };
};
