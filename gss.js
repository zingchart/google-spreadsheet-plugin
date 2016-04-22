/**
 * Parses the data supplied from Google's API into a json format that ZingChart can consume
 * @param data - the data resulting from a request to Google's published spreadsheet
 * @returns {{title: {text: *}, scaleX: {label: {text: *}, values: Array}, legend: {}, seriesValues: Array, series: Array}}
 */
function parseIt(data) {
  var max = Number(data['feed']['entry'][0]['gs$cell']['col']);
  var temp = -1;
  for (var i = 0; i < data['feed']['entry']['length']; i++) {
    temp = Number(data['feed']['entry'][i]['gs$cell']['col']);
    if (temp >= max) max = temp;
    else break;
  }

  var matrix = {};
  for (var j = 2; j <= max; j++) {
    matrix['series_' + (j-1).toString()] = [];
  }

  // First, determine if the gssData contains 'axisTitles'
  // chartTitle is specified by the GoogleSpreadsheet Title ie. "Sheet1", that is at the bottom of the spreadsheet as a tab
  var chartTitle = data['feed']['title']['$t'];
  var docRoot = data['feed']['entry'];
  var xAxisTitle = docRoot[0]['gs$cell']['$t'];

  var seriesTitles = [];
  var xAxisSeries = [];
  var rowNum = -1;
  for (var index = 1; index < docRoot.length;index++) {
    var cell = docRoot[index]['gs$cell'];
    var cellData = cell['$t'];
    var row = Number(cell['row']);
    var col = Number(cell['col']);
    if (row == 1) {
      seriesTitles.push(cellData);
      rowNum = row;
    } else {
      if (col == 0) {
        xAxisSeries.push(cellData);
      } else {
        if (cell['numericValue']) cellData = Number(cellData);
        if (col == 1) xAxisSeries.push(cellData);
        else matrix['series_' + (col-1).toString()].push(cellData);
      }
    }
  }

  var series = [];
  var t = 0;
  for (var attr in matrix) {
    series.push({
      values: matrix[attr],
      text: seriesTitles[t]
    });
    t++;
  }

  var formattedSeries = [];
  for (var a in series) {
    console.log('a: ', a);
    formattedSeries.push(series[a].values);
  }

  return {
    title: {
      text: chartTitle
    },
    scaleX: {
      label: {
        text: xAxisTitle
      },
      values: xAxisSeries
    },
    legend: {},
    seriesValues: formattedSeries,
    series: series
  };
}

/**
 * Renders a ZingChart chart
 * @param oConfig - the ZingChart configuration object
 */
function renderGoogleData(oConfig) {
  $.ajax({
    type: "GET",
    dataType: 'jsonp',
    url: "http://spreadsheets.google.com/feeds/cells/" + oConfig.key + "/od6/public/values?alt=json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function (oGoogleData) {

      var oParsedData = parseIt(oGoogleData);
      var newConfig = {};
      for (var attr in oConfig.data) {
        newConfig[attr] = oConfig.data[attr];
      }

      // Setting title according to GSS unless user specified a title in their configuration
      newConfig.title = oConfig.data.title ? oConfig.data.title : oParsedData.title;
      newConfig.series = oConfig.data.series ? oConfig.data.series : oParsedData.series;
      newConfig.scaleX = oConfig.data.scaleX ? oConfig.data.scaleX : oParsedData.scaleX;

      // if user did not specify series titles, then use the series titles from Google Spreadsheet
      if (!newConfig.series[0].text) {
        for (var h in newConfig.series) {
          newConfig.series[h].text = oParsedData.series[h].text;
        }
      }

      // if user did not specify a scaleX label, then use the scaleX label from GSS
      if (newConfig.scaleX.label) {
        if (!newConfig.scaleX.label.text) {
          newConfig.scaleX.label.text = oParsedData.scaleX.label.text;
        }
      } else {
        newConfig.scaleX.label = oParsedData.scaleX.label;
      }

      // if user did not specify scaleX values then use the scaleX values from GSS
      if (!newConfig.scaleX.values) {
        newConfig.scaleX.values = oParsedData.scaleX.values;
      }

      // no matter what, use the series values from GSS
      for (var index in newConfig.series) {
        newConfig.series[index].values = oParsedData.series[index].values;
      }

      zingchart.render({
        id: oConfig.id,
        width: oConfig.width,
        height: oConfig.height,
        theme: oConfig.theme,
        data: newConfig
      });
    }
  });
}