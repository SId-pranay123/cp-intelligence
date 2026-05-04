'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CONCEPT_GROUPS, CONCEPT_EDGES } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>;
}

// D3 mutates these in place, so we declare x/y/fx/fy as optional
interface GNode {
  id: string;
  name: string;
  group: string;
  strength: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GLink {
  source: string | GNode;
  target: string | GNode;
}

function nodeColor(s: number): string {
  if (s <= 0)  return '#1c1c2e';
  if (s < 40)  return '#7f1d1d';
  if (s < 70)  return '#78350f';
  if (s < 85)  return '#14532d';
  return '#15803d';
}

function nodeBorder(s: number): string {
  if (s <= 0)  return '#2d2d46';
  if (s < 40)  return '#991b1b';
  if (s < 70)  return '#92400e';
  if (s < 85)  return '#166534';
  return '#16a34a';
}

function labelColor(s: number): string {
  if (s <= 0)  return '#475569';
  if (s < 40)  return '#f87171';
  if (s < 70)  return '#fbbf24';
  if (s < 85)  return '#86efac';
  return '#4ade80';
}

export default function KnowledgeGraph({ strengths }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const nodes: GNode[] = useMemo(
    () =>
      CONCEPT_GROUPS.flatMap((g) =>
        g.concepts.map((c) => ({
          id: c.id,
          name: c.name,
          group: g.label,
          strength: strengths[c.id] ?? 0,
        }))
      ),
    [strengths]
  );

  const links: GLink[] = useMemo(
    () => CONCEPT_EDGES.map((e) => ({ source: e.from, target: e.to })),
    []
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    const tip = tooltipRef.current;
    if (!svgEl || !tip) return;

    const W = svgEl.clientWidth || 900;
    const H = 560;

    const svg = d3.select(svgEl).attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();

    const root = svg.append('g');

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (ev) => root.attr('transform', ev.transform))
    );

    const nd: GNode[] = nodes.map((n) => ({ ...n }));
    const ld: GLink[] = links.map((l) => ({ ...l }));

    const sim = d3
      .forceSimulation<GNode>(nd)
      .force(
        'link',
        d3.forceLink<GNode, GLink>(ld)
          .id((d) => d.id)
          .distance(52)
          .strength(0.35)
      )
      .force('charge', d3.forceManyBody<GNode>().strength(-130))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide<GNode>(13))
      .alphaDecay(0.028);

    const link = root
      .append('g')
      .selectAll<SVGLineElement, GLink>('line')
      .data(ld)
      .join('line')
      .attr('stroke', '#1e1e30')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.6);

    const nodeG = root
      .append('g')
      .selectAll<SVGCircleElement, GNode>('circle')
      .data(nd)
      .join('circle')
      .attr('r', 8)
      .attr('fill', (d) => nodeColor(d.strength))
      .attr('stroke', (d) => nodeBorder(d.strength))
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab');

    nodeG
      .on('mouseover', function (ev: MouseEvent, d: GNode) {
        d3.select<SVGCircleElement, GNode>(this).attr('r', 11).attr('stroke-width', 2.5);
        tip.style.opacity = '1';
        tip.innerHTML = `
          <div style="color:#818cf8;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">${d.group}</div>
          <div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:2px">${d.name}</div>
          <div style="font-size:11px">
            <span style="color:#94a3b8">Strength: </span>
            <span style="color:${labelColor(d.strength)};font-weight:700">
              ${d.strength > 0 ? Math.round(d.strength) + '%' : 'No data'}
            </span>
          </div>
        `;
      })
      .on('mousemove', (ev: MouseEvent) => {
        tip.style.left = ev.clientX + 14 + 'px';
        tip.style.top  = ev.clientY - 40 + 'px';
      })
      .on('mouseout', function () {
        d3.select<SVGCircleElement, GNode>(this).attr('r', 8).attr('stroke-width', 1.5);
        tip.style.opacity = '0';
      });

    nodeG.call(
      d3.drag<SVGCircleElement, GNode>()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.2).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (ev, d) => {
          d.fx = ev.x;
          d.fy = ev.y;
        })
        .on('end', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GNode).x ?? 0)
        .attr('y1', (d) => (d.source as GNode).y ?? 0)
        .attr('x2', (d) => (d.target as GNode).x ?? 0)
        .attr('y2', (d) => (d.target as GNode).y ?? 0);

      nodeG
        .attr('cx', (d) => d.x ?? 0)
        .attr('cy', (d) => d.y ?? 0);
    });

    return () => { sim.stop(); };
  }, [nodes, links]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-5 mb-3 text-xs font-mono text-slate-500 flex-wrap">
        <span>Strength:</span>
        {[
          { label: 'No data', fill: '#1c1c2e', border: '#2d2d46' },
          { label: '< 40',   fill: '#7f1d1d', border: '#991b1b' },
          { label: '40–70',  fill: '#78350f', border: '#92400e' },
          { label: '70–85',  fill: '#14532d', border: '#166534' },
          { label: '85+',    fill: '#15803d', border: '#16a34a' },
        ].map(({ label, fill, border }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full border"
              style={{ background: fill, borderColor: border }} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-slate-700">Drag · scroll to zoom · pan</span>
      </div>

      <svg
        ref={svgRef}
        className="w-full rounded-lg border border-[#1a1a2a] bg-[#08080f]"
        style={{ height: 560 }}
      />

      <div ref={tooltipRef} className="graph-tooltip" style={{ opacity: 0 }} />
    </div>
  );
}
