var React = require('react');
var interpolate = require('interpolate');

var Feature = React.createClass({
    
    propTypes: {
        widthInBps: React.PropTypes.number.isRequired,
        charWidth: React.PropTypes.number.isRequired,
        height: React.PropTypes.number.isRequired,
        rangeType: React.PropTypes.string.isRequired,
        color: React.PropTypes.string.isRequired,
        name: React.PropTypes.string.isRequired,
        forward: React.PropTypes.bool.isRequired
    },

    render: function() {
        var widthInBps = this.props.widthInBps;
        var charWidth = this.props.charWidth;
        var height = this.props.height;
        var rangeType = this.props.rangeType;
        var forward = this.props.forward;

        var widthInBpsMinusOne = widthInBps - 1;
        var width = widthInBps * charWidth;
        var widthMinusOne = widthInBpsMinusOne * charWidth;
        var points;

        // starting from the top left of the feature
        if (rangeType === 'middle') {
            //draw a rectangle
            points = interpolate('0,0 {width},0 {width},{height} 0,{height} 0,0', {
                width: width,
                height: height
            });
        } else if (rangeType === 'middle') {
            //draw a rectangle
            points = interpolate('0,0 {width},0 {width},{height} 0,{height} 0,0', {
                width: width,
                height: height
            });
        } else {
            points = interpolate('0,0 {widthMinusOne},0 {width},{heightHalved} {widthMinusOne},{height} 0,{height} 0,0', {
                width: width,
                widthMinusOne: widthMinusOne,
                height: height,
                heightHalved: height / 2
            });
        }
        return (
            <g
            onClick={this.props.onClick}
            >
            <polyline
                transform={forward ? null : "translate("+width+",2.5) scale(-1,1) "} //tnrtodo: this 2.5 shouldn't be hardcoded. it is in there to make the annotation slightly smaller
                points={points}
                strokeWidth="1"
                stroke={this.props.color}
                fillOpacity={0.4}
                fill={this.props.color || 'orange'}>
            </polyline>
            <text 
              x="0"  
              y="0"
              style={{textAnchor: "middle"}}
              >
              {this.props.letter}
            </text>
          </g>
        );
    }
});
module.exports = Feature;