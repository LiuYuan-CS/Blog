//
// d3sparql.js - utilities for visualizing SPARQL results with the D3 library
//
//   Web site: http://github.com/ktym/d3sparql/
//   Copyright: 2013-2015 (C) Toshiaki Katayama (ktym@dbcls.jp)
//   License: BSD license (same as D3.js)
//   Initial version: 2013-01-28
//

var d3sparql = {
  version: "d3sparql.js version 2015-11-19",
  debug: true  // set to true for showing debug information
}

var d3sparql_started = false;


var searcher = new CompoundSearch("https://beta.openphacts.org/2.1", "161aeb7d", "cffc292726627ffc50ece1dccd15aeaf");

var num_property = 4;

var prev_focus_id=-1;

var property_per_color = [
							{'type':'Protein','color':'#17BECF'},
							{'type':'GeneProduct','color':'#FFBB78'},
							{'type':'Metabolite','color':'#9EDAE5'},
							{'type':'Rna','color':'#CEF2E0'}
						];
var cnt_per_property = [];
var status_property=[];
var info_by_type = [];
var svg_force_width,svg_force_height;

function circle_foucs(i)
{
	d3.select(".circle" + i)
            .transition()
            .attr("r", "40") 
            .attr("fill", "#FF7F0E");//"#CEDFFf"	
	d3.select(".marker"+i)
	  .transition()
	  .attr("refX",25);			
}

function circle_foucsover(d,i)
{
	d3.select(".circle" + i) 
		.transition()
		.attr("r","24") 
		.attr("fill", circleColor(d));	
	d3.select(".marker"+i)
	  .transition()
	  .attr("refX",18);		
}


function trim(str)
{
	var result = "";
	var i=0,j=0;
	if(str == null) return "";
	return str;
}

d3sparql.query = function(endpoint, sparql, callback) {
  var url = endpoint + "?query=" + encodeURIComponent(sparql)
  if (d3sparql.debug) { console.log(endpoint) }
  if (d3sparql.debug) { console.log(url) }
  var mime = "application/sparql-results+json"
  d3.xhr(url, mime, function(request) {
    //alert("aaaa");
    var json = request.responseText

     //alert("bbbbb");
    if (d3sparql.debug) { console.log(json) }
    callback(JSON.parse(json))
  })
/*
  d3.json(url, function(error, json) {
    if (d3sparql.debug) { console.log(error) }
    if (d3sparql.debug) { console.log(json) }
    callback(json)
  })
*/
}

/*
  Convert sparql-results+json object into a JSON graph in the {"nodes": [], "links": []} form.
  Suitable for d3.layout.force(), d3.layout.sankey() etc.

  Options:
    config = {
      "key1":   "node1",       // SPARQL variable name for node1 (optional; default is the 1st variable)
      "key2":   "node2",       // SPARQL variable name for node2 (optional; default is the 2nd varibale)
      "label1": "node1label",  // SPARQL variable name for the label of node1 (optional; default is the 3rd variable)
      "label2": "node2label",  // SPARQL variable name for the label of node2 (optional; default is the 4th variable)
      "value1": "node1value",  // SPARQL variable name for the value of node1 (optional; default is the 5th variable)
      "value2": "node2value"   // SPARQL variable name for the value of node2 (optional; default is the 6th variable)
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.forcegraph(json, config)
      d3sparql.sankey(json, config)
    }

  TODO:
    Should follow the convention in the miserables.json https://gist.github.com/mbostock/4062045 to contain group for nodes and value for edges.
*/
d3sparql.graph = function(json, config) {
  config = config || {}

  var head = json.head.vars
  var data = json.results.bindings

  for(var index_property=0;index_property < num_property;index_property++)
	  cnt_per_property[index_property] = 0;
  
  var opts = {
    "key1":   config.key1   || head[0] || "key1",
    "key2":   config.key2   || head[1] || "key2",
    "label1": config.label1 || head[2] || false,
    "label2": config.label2 || head[3] || false,
    "type1" : config.type1  || head[4] || false,
    "type2" : config.type2  || head[5] || false,
    "name"  : config.name   || head[6] || false,
    "description" : config.description || head[7] || false,
    //"value1": config.value1 || head[8] || false,
    //"value2": config.value2 || head[9] || false,
  }
  var graph = {
    "nodes": [],
    "links": []
  }
  var check = d3.map()
  var index = 0
  var pathway_name="No Information!";
  var pathway_description="No Information!";
  for (var i = 0; i < data.length; i++) {
    var key1 = data[i][opts.key1].value
    var key2 = data[i][opts.key2].value
    var label1 = opts.label1 ? data[i][opts.label1].value : key1
    var label2 = opts.label2 ? data[i][opts.label2].value : key2
    var type1  = opts.type1  ? data[i][opts.type1].value  : type1
    var type2  = opts.type2  ? data[i][opts.type2].value  : type2
    var name   = opts.name   ? data[i][opts.name].value   : name
    var description = (opts.description && data[i][opts.description])? data[i][opts.description].value : description
    //var value1 = opts.value1 ? data[i][opts.value1].value : false
    //var value2 = opts.value2 ? data[i][opts.value2].value : false
	if(trim(name) != "")
		pathway_name = trim(name);
	if(trim(description) != "")
		pathway_description = trim(description);
	
    if (!check.has(key1)) {
      graph.nodes.push({"key": key1, "label": label1, "name":name, "description": description, "type": type1,"index":index})//"value": value1,
      check.set(key1, index)
	  
	  info_by_type[index] = {"key":key1,"type":type1,"label":label1}; 
	  
      index++
	 //*************************************a**************************
	  for(var index_property=0;index_property < num_property;index_property++)
	  {
		  if("http://vocabularies.wikipathways.org/wp#"+property_per_color[index_property].type == type1)
		  {
			  cnt_per_property[index_property]++;
			  break;
		  }
	  }	  
	  //*************************************a**************************
    }
    if (!check.has(key2)) {
      graph.nodes.push({"key": key2, "label": label2,"name":name, "description": description,"type": type2, "index":index})//"value": value2,
      check.set(key2, index)

	  info_by_type[index] = {"key":key2,"type":type2,"label":label2}; 
	  
      index++
	  //*************************************b**************************
	  for(var index_property=0;index_property < num_property;index_property++)
	  {
		  if("http://vocabularies.wikipathways.org/wp#"+property_per_color[index_property].type == type2)
		  {
			  cnt_per_property[index_property]++;
			  break;
		  }
	  }		
		//*************************************b**************************	  
    }
    graph.links.push({"source": check.get(key1), "target": check.get(key2)})
  }
  if (d3sparql.debug) { console.log(JSON.stringify(graph)) }
  $("#pathway_description").html(pathway_description);
  $("#pathway_name").html(pathway_name);
  $("#pathway_description").attr("class","alert alert-success");
  $("#pathway_name").attr("class","alert alert-success");
  $("#div_main").attr("style","border-left-width:1px;border-left-style:dashed;");
  $("#filter_result").attr("style","height:200px;overflow-y:scroll;border-width:1px;border-style:solid;margin-bottom:0px;");
  
  var legend_str = "";
  for(var i=0;i<num_property;i++)
  {
	  if(cnt_per_property[i] > 0)
		  legend_str = legend_str + "<div class='label label-success' style='display:inline-block; width:150px; margin:10px;color:#000;background-color:" + property_per_color[i].color + "'>" + property_per_color[i].type + "<span class='badge'>"+ cnt_per_property[i] + "</span></div>";
  }
  $("#legend").html(legend_str);
  return graph
}


d3sparql.forcegraph = function(json, config) {
//***************************1******************************
  arrowhead_scale = d3.scale.linear()
    .domain([10, 30])
    .range([20, 60]);	
	
  function markerscale (d) {
    return arrowhead_scale(10) + "pt";
  }	;
//***************************1*******************************
	
  config = config || {}

  var graph = (json.head && json.results) ? d3sparql.graph(json, config) : json

  var scale = d3.scale.linear()
    .domain(d3.extent(graph.nodes, function(d) { return parseFloat(d.value) }))
    .range([1, 20])

  var opts = {
    "radius":    config.radius    || function(d) { return 24 },//15 + d.label.length d.value ? scale(d.value) : 
    "charge":    config.charge    || -1000,
    "distance":  config.distance  || 100,
    "width":     config.width     || 1900,
    "height":    config.height    || 890,
    "label":     config.label     || false,
    "selector":  config.selector  || null
  }

  svg_force_width = opts.width;
  svg_force_height = opts.height;  
  
  var id_img="";
  
  var callback=function(success, status, response){
    console.log(success);
    if(success != true || status != '200') return;
     var compoundResult = searcher.parseCompoundResponse(response);
     
     id_img = "http://ops.rsc.org/api/image/compound/";
     if(compoundResult.csURI == null) return;
     for(var i=0;i<compoundResult.csURI.length;i++)
       if(compoundResult.csURI[i] >= '0' && compoundResult.csURI[i] <= '9')
         id_img = id_img + compoundResult.csURI[i]; 
    d3.select("#tip_img").attr('src',id_img)
  }  
//***************************2***********************
if(!d3sparql_started)
{
	node_tip = d3.tip()
	  .attr('id', 'node-tip')
	  .offset([10, 0])
	  .direction('s')
	  .html(function(d) { 
	//    return '<span>id: </span>' + d.id + "</br>" + '<span>x: </span>' + Math.round(d.x * 100)/100 + '</br>' + '<span>y: </span>' + Math.round(d.y * 100)/100 + '</br>' + '<span>fixed: </span>' + Boolean(d.fixed);
	//	  return "<span>Name: </span>" + d.name + "</br>" + "<span>Type: </span>" + d.type + "</br>" + "<span>Link: </span><a href='"+d.link+"'>"+d.link+"</a>" + "</br>" + "<span>Fixed: </span>" + Boolean(d.fixed);
      searcher.fetchCompound(d.key, null, callback);   
      var tip_html = "<div class='alert alert-warning alert-dismissible' style='opacity:0.9;' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span style='font-size:32px;' aria-hidden='true'>&times;</span></button>";
      var info = "<img id='tip_img'></br><strong><span>Name: </span>" + d.label + "</br>" + "<span>Type: </span>" + d.type + "</br>" +"<span>Link: <a href='"+d.key+ "'target='_blank'>"+d.key+"</a>"+" </span>"+"</br>"+ "<span>MoreInformation: </span><a href='index.html?uri="+d.key+"&name="+d.label+"' target='_blank'>"+d.label+"</a>" + "</strong>";
      tip_html = tip_html + info + "</div>";

      return tip_html; 
      /*var tip_html = "<div class='alert alert-warning alert-dismissible' style='opacity:0.8;' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span style='font-size:32px;' aria-hidden='true'>&times;</span></button>";
      var info = "<img id='tip_img'><strong><span>Name: </span>" + d.label + "</br>" + "<span>Type: </span>" + d.type + "</br>" + "<span>Link: </span><a href='index.html?uri="+d.key+"' target='_blank'>"+d.key+"</a>" + "</strong>";
      tip_html = tip_html + info + "</div>";

      return tip_html;*/
	  });  	  
	d3sparql_started = true;
}  
//*******************************2************************************  
var zoom = d3.behavior.zoom()
          .scaleExtent([0.1, 10])
          .on("zoom", function() {
      svg.attr("transform", 
       "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
   });
  var svg = d3sparql.select(opts.selector, "forcegraph").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
///////////////////////////////////////////
	.attr( "style","border-width:1px;border-style:solid;")
/////////////////////////////////////////////	
    .append("g")
    .call(zoom)
     //.attr('startOffset','50%')
     //var svg = d3.select("body").append("svg")
     // .attr("width", 300)
     // .attr("height", 300)
     // .attr("viewBox", "0 0 1000 1000")
     // .append("g")
     // .attr("transform", "translate(0,0)");
  //var zoom = d3.behavior.zoom()
   //       .scaleExtent([1, 10])
    //      .on("zoom", function() {
     // d3.select(this).attr("transform", 
    //   "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  // });
/*
  var all = svg.append("g")
                .call(zoom);
    
    all.selectAll("body")
        .data(circles)
        .enter()
        .append("circle")
        .attr("cx",function(d){ return d.cx; })
        .attr("cy",function(d){ return d.cy; })
        .attr("r",function(d){ return d.r; })
        .attr("fill","black");*/
 ////////////////////////////////////////
  d3sparql.piechart(graph,svg);	  
////////////////////////////////////////  		
		
//**************************3******************************
	svg.call(node_tip);

  //var node_tip_focus = 0;	

  d3.select("body")
    .on('mouseover',node_tip.hide)
	//.on('zoom', svg.zoom);
	
	
 svg.append("defs").selectAll("marker")
    .data(graph.nodes)
    .enter()
    .append("marker")
      .attr("id", function (d) { return d.index; })
	  //.attr("id","arrow")
      .attr("class",function(d){return "endmarker marker"+d.index;})
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("markerWidth", "8pt")
      .attr("markerHeight", "8pt")
      .attr("orient", "auto")
    .append("path")
      .attr("d", "M0,-2L10,0L0,2");
	  
  svg.selectAll("marker")
    .attr("markerWidth", markerscale)
    .attr("markerHeight", markerscale)
    .select("path")
    .attr("fill", "#bbb");	  
		
  var link = svg.append("g").selectAll(".link")
    .data(graph.links)
    .enter()
    .append("line")
    .attr("class", function (d) { return "link " + d.source; })

	.attr("stroke-width","1")
    .attr("marker-end", function(d) {
      if(d.source == d.target) return;
      return "url(#" + d.target + ")"; 
    });
//****************************3******************************************		
	
	
  var force = d3.layout.force()
    .charge(opts.charge)
    .linkDistance(opts.distance)
//***************************************4**************************
    .linkStrength(1)	
    .chargeDistance(2000)	
	//.gravity(.02)	
//***************************************4**************************	
    .size([opts.width, opts.height])
    .nodes(graph.nodes)
    .links(graph.links)
    .start();
	
//**********************************5*********************************
 var node_drag = force.drag()
    .on("dragstart", dragstart);

  function dragstart(d) {
    d3.select(this).classed("fixed", d.fixed = true);
  }
 
  function releasenode(d) {
    // of course set the node to fixed so the force doesn't include the node in
    // its auto positioning stuff
    d.fixed = false; 
    force.resume();
  } 
 
  var node = svg.selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("g")
    .on('dblclick', releasenode)
   // .on('mouseup',function(){node_tip_focus = 0;})
	.call(node_drag);
//*************************************5*************************************	
  var circle = node.append("circle")
    .attr("class", function(d){return "node circle"+d.index;})
    .attr("r", opts.radius)
    //.attr("fill", "lightblue")
	//.on('mousedown', function(d){$("#node-tip").bind('mousedown',function(event){event.stopPropagation();});node_tip_focus = 1;d3.event.stopPropagation();node_tip.show(d);})
    //.on('mousemove', function(d){if(node_tip_focus == 1 )node_tip.hide(d)})	
    .on("mouseover",function(d,i){  
		if(prev_focus_id != -1)
			circle_foucsover(info_by_type[prev_focus_id],prev_focus_id);

		circle_foucs(i);
		$("#node-tip").bind('mouseover',function(event){event.stopPropagation();});node_tip_focus = 1;d3.event.stopPropagation();node_tip.show(d);	
	})    


    .on("mouseout",function(d,i){  
		circle_foucsover(d,i);			            
		//node_tip.hide(d)
            });

  var text = node.append("text")
    .text(function(d) { return d[opts.label || "label"] })
	//.attr("startOffset","50%")
    .attr("class", "node")
    .on("mouseover",function(d,i){  
        d3.select(".circle"+d.index)  
            .transition()
            .attr("r", function(d) { return  40 }) 
            .attr("fill", "#FF7F0E")//"#CEDFFf"
    $("#node-tip").bind('mouseover',function(event){event.stopPropagation();});node_tip_focus = 1;d3.event.stopPropagation();node_tip.show(d);  
            

        d3.select(".marker"+d.index)
          .transition()
          .attr("refX",25);
        })
    .on("mouseout",function(d,i){  
        d3.select(".circle"+d.index)  
            .transition()
            .attr("r", function(d) { return  24 }) 
            .attr("fill", circleColor)//"#CEF2E0"
        d3.select(".marker"+d.index)
          .transition()
          .attr("refX",18);            
    //node_tip.hide(d)
            });
	


  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x })
        .attr("y1", function(d) { return d.source.y })
        .attr("x2", function(d) { return d.target.x })
        .attr("y2", function(d) { return d.target.y })
    text.attr("x", function(d) { return d.x - d.label.length * 4})
        .attr("y", function(d) { return d.y + 4})
    circle.attr("cx", function(d) { return d.x })
          .attr("cy", function(d) { return d.y })
  })
  node.call(force.drag)

  // default CSS/SVG
  link.attr({
    "stroke": "#999999",
  })
  //path.attr();
  circle.attr({
    "stroke": "lightblue",
    "stroke-width": "1px",
    "fill": circleColor,//"#CEF2E0",
    "opacity": 1,
    "scale": 1,
  })
  text.attr({
    "font-size": "8px",
    "font-family": "sans-serif",
  })

//var rect = bar.selectAll("cilrcle")  
  //.on("mouseover",function(d,i){  
    //    d3.select(this)  
            //.attr("fill","yellow");  
            //.transition()
            //.attr("scale", "1.5")
            //.transition()  
            //.duration(500)
            //.attr();
   // })  
  //.on("mouseover", handleMouseOver)
   //var zoom = d3.behavior.zoom()
        //.scaleExtent([ratio_init, 3])
       // .on("zoom", zoomed);
       // zoom.translate([0,0]).scale(ratio_init);
        //zoom.event(_svg.transition().duration(200));

      svg.append("text")
          .attr("x", 50)
          .attr("y", 30)
          .attr("fill","steelblue")
          .style("font-size","15pt")
          .style("font-family", "Courier New")
          .text(function(d) { return d[opts.name || "label"] })
      
 

}


function circleColor(d){if(d.type == "http://vocabularies.wikipathways.org/wp#Protein") return "#17BECF";
                        if(d.type == "http://vocabularies.wikipathways.org/wp#GeneProduct") return "#FFBB78";
                        if(d.type == "http://vocabularies.wikipathways.org/wp#Metabolite") return "#9EDAE5";
                       if(d.type == "http://vocabularies.wikipathways.org/wp#Rna") return "#CEF2E0";


                        }

function handleMouseOver(d, i) {  // Add interactivity

            // Use D3 to select element, change color and size
            d3.select(this).attr({
              fill: "orange",
              r: radius * 2
            });
}
d3sparql.select = function(selector, type) {
  if (selector) {
    return d3.select(selector).html("").append("div").attr("class", "d3sparql " + type)
  } else {
    return d3.select("body").append("div").attr("class", "d3sparql " + type)
  }
}

/*
  Rendering sparql-results+json object into a pie chart

  References:
    http://bl.ocks.org/mbostock/3887235 Pie chart
    http://bl.ocks.org/mbostock/3887193 Donut chart

  Options:
    config = {
      "label":    "pref",    // SPARQL variable name for slice label (optional; default is the 1st variable)
      "size":     "area",    // SPARQL variable name for slice value (optional; default is the 2nd variable)
      "width":    700,       // canvas width (optional)
      "height":   600,       // canvas height (optional)
      "margin":   10,        // canvas margin (optional)
      "hole":     50,        // radius size of a center hole (optional; 0 for pie, r > 0 for doughnut)
      "selector": "#result"
    }

  Synopsis:
    d3sparql.query(endpoint, sparql, render)

    function render(json) {
      var config = { ... }
      d3sparql.piechart(json, config)
    }

  CSS/SVG:
    <style>
    .label {
      font: 10px sans-serif;
    }
    .arc path {
      stroke: #ffffff;
    }
    </style>
*/
d3sparql.piechart = function(graph,svg_force) {
  for(var i=0;i<num_property;i++)
	  status_property[i] = 0;


  var opts = {
    "label":    "pref",
    "size":     "area",
    "width":    350,
    "height":   350,
    "margin":   30,
    "hole":     30,
    "selector": "#result1"
  }

  var radius = Math.min(opts.width, opts.height) / 2 - opts.margin
  var hole = Math.max(Math.min(radius - 50, opts.hole), 0)
  var color = d3.scale.category20()

  var arc = d3.svg.arc()
    .outerRadius(radius)
    .innerRadius(hole)

  var total_cnt = 0;
  for(var i=0;i<num_property;i++)
	  total_cnt = total_cnt + cnt_per_property[i];
  
  var data=[0,1,2,3];
	
  var pie = d3.layout.pie()
    //.sort(null)
    .value(function(d,i) { return cnt_per_property[i]; })

  var svg = d3sparql.select(opts.selector, "piechart").append("svg")
    .attr("width", opts.width)
    .attr("height", opts.height)
    .append("g")
    .attr("transform", "translate(" + opts.width / 2 + "," + opts.height / 2 + ")")

  var g = svg.selectAll(".arc")
    .data(pie(data))
    .enter()
    .append("g")
    .attr("class", "arc")
	.on("mouseover",function(d,i){
        d3.select(this)  
            .transition()
            .attr("transform","scale(1.2)") 
	})
	.on("mouseout",function(d,i){
		if(status_property[i]) return;
        d3.select(this)  
            .transition()
            .attr("transform","scale(1/1.2)");
	})	
	.on("click",function(d,i){
		status_property[i] = 1 - status_property[i];

		var filter_result = "";
		
		for(var i=0;i<total_cnt;i++)
		{
			for(var j=0;j<num_property;j++)
				if("http://vocabularies.wikipathways.org/wp#" + property_per_color[j].type == info_by_type[i].type)
					break;
			if(j<num_property)
				if(status_property[j] == 1)
					filter_result = filter_result + "<li class='list-group-item' id='" + i + "list' style='background-color:"+property_per_color[j].color+"'>" + info_by_type[i].label + "</li>";
		}
		$("#filter_result").html(filter_result);
		$(".list-group-item").bind("click",
			function(event)
			{
				var id_str = $(event.target).attr("id");
				var id = "";
				var i =0;
				while(id_str[i] >= '0' && id_str[i] <= '9')
					id = id + id_str[i++];
				var key = $(event.target).html();
				
				if(prev_focus_id != -1)
					circle_foucsover(info_by_type[prev_focus_id],prev_focus_id);
				prev_focus_id = id;					
				circle_foucs(id);
				
				var cx = d3.select(".circle"+id).attr("cx"),cy = d3.select(".circle"+id).attr("cy");  

				svg_force.attr("transform", 
					   "translate(" + (svg_force_width / 2 - parseFloat(cx)).toString() + "," + (svg_force_height / 2 - parseFloat(cy)).toString() + ")");				
			});
		if(status_property[i] == 0) return;
        d3.select(this)  
            .transition()
            .attr("transform","scale(1.2)") 
		
	})	
	
  var slice = g.append("path")
    .attr("d", arc)
    .attr("fill", function(d, i) { return property_per_color[i].color; })
	.attr("style","opacity:0.6;");
	
  var cur_angle = 0;
  var text = g.append("text")
    .attr("class", "label")
    .attr("transform", function(d) { 
			var curx = arc.centroid(d)[0],cury = arc.centroid(d)[1];
			var cos_value = curx / Math.sqrt((curx * curx + cury * cury));
			var angle = Math.acos(cos_value) / Math.PI * 180;
			if((curx <= 0 && cury <= 0) || (curx >= 0 && cury <= 0))
				angle = 360 - angle;
			if(angle >= 90 && angle <=270) angle = angle + 180;
            return  "translate(" + arc.centroid(d) + ")" +  
                    "rotate(" + angle + ")"; 	
		})
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .text(function(d,i) { if(cnt_per_property[i]) return property_per_color[i].type; else return ""; })
	//.append("tspan")  		
	// .attr("dy","1em") 
	// .text(function(d,i){if(cnt_per_property[i]) return cnt_per_property[i];});

  // default CSS/SVG
  slice.attr({
    "stroke": "#ffffff",
  })
  // TODO: not working?
  svg.selectAll("text").attr({
    "stroke": "none",
    "fill": "black",
    "font-size": "20px",
    "font-family": "sans-serif",
  })
}

/* Helper function only for the d3sparql web site */
d3sparql.toggle = function() {
  var button = d3.select("#button")
  var elem = d3.select("#sparql")
  if (elem.style("display") === "none") {
    elem.style("display", "inline")
    button.attr("class", "icon-chevron-up")
  } else {
    elem.style("display", "none")
    button.attr("class", "icon-chevron-down")
  }
}

/* for IFRAME embed */
d3sparql.frameheight = function(height) {
  d3.select(self.frameElement).style("height", height + "px")
}

