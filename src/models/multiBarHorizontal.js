
/***
 * This should be pretty close to identical to the multiBar model, but this model
 * has the bars horizontal.
 * Currently naming the vertical axis X, due to helper functions that think the 
 * bars are vertical
 */

nv.models.multiBarHorizontal = function() {
  var margin = {top: 0, right: 0, bottom: 0, left: 0},
      width = 960,
      height = 500,
      id = Math.floor(Math.random() * 10000), //Create semi-unique ID in case user doesn't select one
      getX = function(d) { return d.x },
      getY = function(d) { return d.y },
      forceY = [],
      clipEdge = true,
      stacked = false,
      color = d3.scale.category20().range(),
      xDomain, yDomain,
      x0, y0;

  //var x = d3.scale.linear(),
  var x = d3.scale.ordinal(),
      y = d3.scale.linear(),
      dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout');


  function chart(selection) {
    selection.each(function(data) {
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom;

      //store old scales if they exist
      x0 = x0 || x;
      y0 = y0 || y;

      if (stacked) {
      //var stackedData = d3.layout.stack()
        data = d3.layout.stack()
                     .offset('zero')
                     .values(function(d){ return d.values })
                     .y(getY)
                     (data);
      }



      //add series index to each data point for reference
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point) {
          point.series = i;
          return point;
        });
        return series;
      });


      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
            data.map(function(d) { 
              return d.values.map(function(d,i) {
                return { x: getX(d,i), y: getY(d,i), y0: d.y0 }
              })
            });

      x   .domain(d3.merge(seriesData).map(function(d) { return d.x }))
          .rangeBands([0, availableHeight], .1);

      y   .domain(yDomain || [0,d3.max(d3.merge(seriesData).map(function(d) { return d.y + (stacked ? d.y0 : 0) }).concat(forceY))])
          .range([0, availableWidth]);



      var wrap = d3.select(this).selectAll('g.d3multibar').data([data]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 multibar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');

      gEnter.append('g').attr('class', 'groups');

      var g = wrap.select('g')
      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');



      defsEnter.append('clipPath')
          .attr('id', 'edge-clip-' + id)
        .append('rect');
      wrap.select('#edge-clip-' + id + ' rect')
          .attr('width', availableWidth)
          .attr('height', availableHeight);

      g   .attr('clip-path', clipEdge ? 'url(#edge-clip-' + id + ')' : '');



      var groups = wrap.select('.groups').selectAll('.group')
          .data(function(d) { return d }, function(d) { return d.key });
      groups.enter().append('g')
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          /*
          .attr('transform', function(d,i) {
              return stacked ? 
                        'translate(0,0)'
                      : 'translate(' + (i * x.rangeBand() / data.length ) + ',0)'
          });
         */
      d3.transition(groups.exit())
          .style('stroke-opacity', 1e-6)
          .style('fill-opacity', 1e-6)
          .remove();
      groups
          .attr('class', function(d,i) { return 'group series-' + i })
          .classed('hover', function(d) { return d.hover })
          .style('fill', function(d,i){ return color[i % 10] })
          .style('stroke', function(d,i){ return color[i % 10] });
      d3.transition(groups)
      /*
          .attr('transform', function(d,i) {
              return stacked ? 
                        'translate(0,0)'
                      : 'translate(' + (i * x.rangeBand() / data.length ) + ',0)'
          })
         */
          .style('stroke-opacity', 1)
          .style('fill-opacity', .75);


      var bars = groups.selectAll('rect.bar')
          .data(function(d) { return d.values });

      bars.exit().remove();


      var barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          //.attr('fill', function(d,i) { return color[0]; })
          .attr('y', function(d,i,j) {
              return stacked ? 0 : (j * x.rangeBand() / data.length )
          })
          //.attr('y', function(d,i) {  return y(Math.max(0, getY(d,i))) })
          //.attr('height', function(d,i) { return Math.abs(y(getY(d,i)) - y(0)) })
          .attr('x', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('width', 0)
          .attr('height', x.rangeBand() / (stacked ? 1 : data.length) )
          .on('mouseover', function(d,i) { //TODO: figure out why j works above, but not here
            d3.select(this).classed('hover', true);
            dispatch.elementMouseover({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('mouseout', function(d,i) {
            d3.select(this).classed('hover', false);
            dispatch.elementMouseout({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
          })
          .on('click', function(d,i) {
            dispatch.elementClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          })
          .on('dblclick', function(d,i) {
            dispatch.elementDblClick({
              value: getY(d,i),
              point: d,
              series: data[d.series],
              pos: [x(getX(d,i)) + (x.rangeBand() * (stacked ? data.length / 2 : d.series + .5) / data.length), y(getY(d,i) + (stacked ? d.y0 : 0))],  // TODO: Figure out why the value appears to be shifted
              pointIndex: i,
              seriesIndex: d.series,
              e: d3.event
            });
            d3.event.stopPropagation();
          });
      bars
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'bar negative' : 'bar positive'})
          .attr('transform', function(d,i) { return 'translate(0,' + x(getX(d,i)) + ')'; })
      if (stacked)
        d3.transition(bars)
            .delay(function(d,i) { return i * 1000 / data[0].values.length })
            .attr('x', function(d,i) {
              return y(d.y0);
              //return y(getY(d,i) + d.y0);
              //return y(getY(d,i) + (stacked ? d.y0 : 0));
            })
            .attr('width', function(d,i) {
              return Math.abs(y(d.y + d.y0) - y(d.y0))
            })
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('y', function(d,i) {
                  return 0
                })
                .attr('height', x.rangeBand() );
            })
      else
        d3.transition(bars)
          .delay(function(d,i) { return i * 1200 / data[0].values.length })
            .attr('y', function(d,i) {
              return d.series * x.rangeBand() / data.length
            })
            .attr('height', x.rangeBand() / data.length )
            .each('end', function() {
              d3.transition(d3.select(this))
                .attr('x', function(d,i) {
                  return getY(d,i) < 0 ? //TODO: stacked must be all positive or all negative, not both?
                      y(getY(d,i)) :
                      y(0)
                })
                .attr('width', function(d,i) {
                  return Math.abs(y(d.y) - y(0))
                  //return Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0)))
                });
            })




      //TODO: decide if this makes sense to add into all the models for ease of updating (updating without needing the selection)
      chart.update = function() {
        selection.transition().call(chart);
      }

      //store old scales for use in transitions on update, to animate from old to new positions, and sizes
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return stacked;
    stacked = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = _;
    return chart;
  };

  chart.id = function(_) {
        if (!arguments.length) return id;
        id = _;
        return chart;
  };



  return chart;
}
