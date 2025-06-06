import { z, ZodError } from 'zod';

export async function validateRFQueryParams(req, res, next) {
  try {
    const json = await jsonQueryParam.parseAsync(req.query.json);
    let flow;
    try {
      flow = await flowQueryParams.parseAsync(JSON.parse(json));
    } catch (parseError) {
      console.error('Error parsing flow JSON:', parseError);
      return res.status(400).send({ msg: 'Invalid flow data format', error: parseError.message });
    }
    res.locals.flow = flow;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).send({ msg: error.issues[0].message });
    }
    console.error('Validation error:', error);
    return res.status(500).send('Server error');
  }
}

export async function validateRFJsonBody(req, res, next) {
  try {
    // Log the body for debugging
    console.log('Received body with nodes:', req.body?.nodes?.length || 0);
    
    let flow;
    try {
      flow = await flowQueryParams.parseAsync(req.body);
    } catch (parseError) {
      console.error('Error parsing flow body:', parseError);
      return res.status(400).send({ msg: 'Invalid flow data format', error: parseError.message });
    }
    res.locals.flow = flow;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).send({ msg: error.issues[0].message });
    }
    console.error('Validation error:', error);
    return res.status(500).send('Server error');
  }
}

const flowQueryParams = z.object({
  width: z.number().default(800),
  height: z.number().default(600),
  title: z.string().optional().default("Architecture Diagram"),
  subtitle: z.string().optional().default(""),
  position: z.union([
    z.literal('top-left'),
    z.literal('top-right'),
    z.literal('bottom-left'),
    z.literal('bottom-right'),
  ]).default('top-left'),
  font: z.string().optional().default('Arial'),
  type: z.union([z.literal('html'), z.literal('png'), z.literal('jpg')]).default('png'),
  nodes: z.array(
    z.object({
      id: z.string({ required_error: "Node 'id' is required" }),
      position: z.object(
        {
          x: z.number({ required_error: "Node 'position.x' is required" }),
          y: z.number({ required_error: "Node 'position.y' is required" }),
        },
        { required_error: "Node 'position' is required" }
      ),
      width: z.number().default(150),
      height: z.number().default(150),
      // Allow any other properties in the node data
      data: z.any().optional(),
      type: z.string().optional(),
      style: z.any().optional(),
    })
  ),
  edges: z
    .array(
      z.object({
        id: z.string({ required_error: "Edge 'id' is required" }),
        source: z.string({ required_error: "Edge 'source' is required" }),
        target: z.string({ required_error: "Edge 'target' is required" }),
        sourceHandle: z.string().optional(),
        targetHandle: z.string().optional(),
        // Allow any other properties in edge data
        type: z.string().optional().default('smoothstep'),
        animated: z.boolean().optional().default(true),
        data: z.any().optional(),
        style: z.any().optional(),
      })
    )
    .optional()
    .default([]),
});

const jsonQueryParam = z.string({
  required_error: "Query param 'json' is required",
}); 