  export function isNodeInsideContainer(node: any, container: any) {
    if (!node || !container) return false;

    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + (node.width || 0);
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + (node.height || 0);

    const containerLeft = container.position.x;
    const containerRight = container.position.x + (container.width || 0);
    const containerTop = container.position.y;
    const containerBottom = container.position.y + (container.height || 0);

    return (
      nodeLeft >= containerLeft &&
      nodeRight <= containerRight &&
      nodeTop >= containerTop &&
      nodeBottom <= containerBottom
    );
  }

  export function attachNodesToContainer(containerNode: any, allNodes: any[], updateNodes: (nodes: any[]) => void) {
    const updatedNodes = allNodes.map((node) => {
      if (node.id === containerNode.id) return node;

      const alreadyGrouped = node.parentId === containerNode.id;
      const isInside = isNodeInsideContainer(
        {
          ...node,
          // Convert to absolute for checking if it's still inside
          position: alreadyGrouped
            ? {
                x: node.position.x + containerNode.position.x,
                y: node.position.y + containerNode.position.y,
              }
            : node.position,
        },
        containerNode
      );

      if (isInside && !alreadyGrouped) {
        return {
          ...node,
          parentId: containerNode.id,
          position: {
            x: node.position.x - containerNode.position.x,
            y: node.position.y - containerNode.position.y,
          },
          positionRelative: true,
        };
      } else if (!isInside && alreadyGrouped) {
        return {
          ...node,
          parentId: undefined,
          position: {
            x: node.position.x + containerNode.position.x,
            y: node.position.y + containerNode.position.y,
          },
          positionRelative: false,
        };
      }

      return node;
    });

    updateNodes(updatedNodes);
  }