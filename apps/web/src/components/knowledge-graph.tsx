'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CONCEPT_GROUPS, CONCEPT_EDGES } from '@/lib/concepts';

interface Props {
  strengths: Record<string, number>;
}

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

function nodeRadius(s: number): number {
  if (s >= 75) return 36;
  if (s >= 40) return 30;
  if (s > 0)   return 24;
  return 18;
}

function nodeFill(s: number): string {
  if (s >= 75) return '#10b981';
  if (s >= 40) return '#065f46';
  if (s > 0)   return '#1c2128';
  return '#161b22';
}

function nodeStroke(s: number): string {
  if (s >= 75) return '#34d399';
  if (s >= 40) return '#10b981';
  if (s > 0)   return '#30363d';
  return '#21262d';
}

function textFill(s: number): string {
  if (s >= 75) return '#ffffff';
  if (s >= 40) return '#6ee7b7';
  if (s > 0)   return '#8b949e';
  return '#484f58';
}

function textSize(name: string, r: number): number {
  const base = r >= 36 ? 11 : r >= 30 ? 10 : 9;
  return name.length > 8 ? base - 1 : base;
}

function wrapLabel(name: string): string[] {
  const words = name.split(' ');
  if (words.length === 1 || name.length <= 8) return [name];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
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
        .scaleExtent([0.15, 3])
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
          .distance(90)
          .strength(0.3)
      )
      .force('charge', d3.forceManyBody<GNode>().strength(-220))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide<GNode>((d) => nodeRadius(d.strength) + 8))
      .alphaDecay(0.025);

    // Links
    const link = root
      .append('g')
      .selectAll<SVGLineElement, GLink>('line')
      .data(ld)
      .join('line')
      .attr('stroke', '#30363d')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5);

    // Node groups
    const nodeG = root
      .append('g')
      .selectAll<SVGGElement, GNode>('g')
      .data(nd)
      .join('g')
      .style('cursor', 'grab');

    // Circles
    nodeG
      .append('circle')
      .attr('r', (d) => nodeRadius(d.strength))
      .attr('fill', (d) => nodeFill(d.strength))
      .attr('stroke', (d) => nodeStroke(d.strength))
      .attr('stroke-width', 1.5);

    // Labels (potentially 2 lines)
    nodeG.each(function (d) {
      const g = d3.select(this);
      const r = nodeRadius(d.strength);
      const lines = wrapLabel(d.name);
      const fs = textSize(d.name, r);
      const lineH = fs + 2;

      lines.forEach((line, i) => {
        g.append('text')
          .text(line)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y', lines.length === 2 ? (i === 0 ? -lineH / 2 : lineH / 2) : 0)
          .attr('fill', textFill(d.strength))
          .attr('font-size', fs)
          .attr('font-weight', d.strength >= 40 ? '600' : '400')
          .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('user-select', 'none');
      });
    });

    // Tooltip & drag
    nodeG
      .on('mouseover', function (ev: MouseEvent, d: GNode) {
        d3.select(this).select('circle').attr('stroke-width', 2.5);
        tip.style.opacity = '1';
        tip.innerHTML = `
          <div style="color:var(--text-muted);font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px">${d.group}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:2px">${d.name}</div>
          <div style="font-size:11px;color:var(--text-secondary)">
            Strength: <span style="color:${textFill(d.strength)};font-weight:700">${d.strength > 0 ? Math.round(d.strength) + '%' : 'No data'}</span>
          </div>
        `;
      })
      .on('mousemove', (ev: MouseEvent) => {
        tip.style.left = ev.clientX + 14 + 'px';
        tip.style.top  = ev.clientY - 44 + 'px';
      })
      .on('mouseout', function () {
        d3.select(this).select('circle').attr('stroke-width', 1.5);
        tip.style.opacity = '0';
      });

    nodeG.call(
      d3.drag<SVGGElement, GNode>()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.2).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
    );

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GNode).x ?? 0)
        .attr('y1', (d) => (d.source as GNode).y ?? 0)
        .attr('x2', (d) => (d.target as GNode).x ?? 0)
        .attr('y2', (d) => (d.target as GNode).y ?? 0);

      nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [nodes, links]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%', height: 560,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'block',
        }}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 16,
        fontSize: 12,
      }}>
        {[
          { label: 'Strong', fill: '#10b981', stroke: '#34d399' },
          { label: 'Mid',    fill: '#065f46', stroke: '#10b981' },
          { label: 'Weak',   fill: '#1c2128', stroke: '#30363d' },
        ].map(({ label, fill, stroke }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%', display: 'inline-block',
              background: fill, border: `1.5px solid ${stroke}`,
            }} />
            {label}
          </span>
        ))}
      </div>

      <div ref={tooltipRef} className="graph-tooltip" style={{ opacity: 0 }} />
    </div>
  );
}
