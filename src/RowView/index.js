import { Button } from "@blueprintjs/core";
import { forEach } from "lodash";
import draggableClassnames from "../constants/draggableClassnames";
import { some, isEqual } from "lodash";
import prepareRowData from "../utils/prepareRowData";
import React from "react";
import Draggable from "react-draggable";
import RowItem from "../RowItem";
// import ReactList from "react-list";

import withEditorInteractions from "../withEditorInteractions";
import ReactList from "./ReactList";
// import TrMmInfScroll from "./TrMmInfScroll";

// import ReactList from './ReactVariable';
import "./style.css";
// import getCutsiteLabelHeights from "../RowItem/getCutsiteLabelHeights";
// import Combokeys from "combokeys";

let defaultContainerWidth = 400;
let defaultCharWidth = 12;
let defaultMarginWidth = 50;

function noop() {}

const annotationsToCompute = {
  translations: {
    annotationHeight: 19,
    hasYOffset: true
  },
  parts: {
    annotationHeight: 19,
    hasYOffset: true
  },
  primers: {
    annotationHeight: 21,
    hasYOffset: true
  },
  cutsites: {
    annotationHeight: 15,
    hasYOffset: false
  },
  features: {
    annotationHeight: 21,
    margin: 10,
    hasYOffset: true
  },
  orfs: {
    annotationHeight: 19,
    hasYOffset: true
  },
  sequence: {
    fixedHeight: 16,
    isAlwaysShown: true
  },
  reverseSequence: {
    fixedHeight: 16
  },
  axis: {
    fixedHeight: 26.79
  },
  cutsiteLabels: {
    // computeHeight: getCutsiteLabelHeights, //tnr: not actually that necessary
    type: "cutsites",
    annotationHeight: 15,
    hasYOffset: true,
    isLabel: true
  }
};

export class RowView extends React.Component {
  static defaultProps = {
    sequenceData: { sequence: "" },
    selectionLayer: {},
    // bpToJumpTo:0,
    editorDragged: noop,
    editorDragStarted: noop,
    editorClicked: noop,
    backgroundRightClicked: noop,
    editorDragStopped: noop,
    // onScroll: noop,
    width: defaultContainerWidth,
    marginWidth: defaultMarginWidth,
    height: 400,
    charWidth: defaultCharWidth,
    RowItemProps: {}
  };

  shouldClearCache = () => {
    const {
      annotationVisibility,
      annotationLabelVisibility,
      sequenceData
    } = this.props;

    const toCompare = {
      bpsPerRow: getBpsPerRow(this.props),
      annotationVisibility,
      annotationLabelVisibility,
      stateTrackingId: sequenceData.stateTrackingId
    };
    if (!isEqual(toCompare, this.oldToCompare)) {
      this.oldToCompare = toCompare;
      return true;
    }
  };

  //this function gives a fairly rough height estimate for the rows so that the ReactList can give a good guess of how much space to leave for scrolling and where to jump to in the sequence
  estimateRowHeight = (index, cache) => {
    const { annotationVisibility, annotationLabelVisibility } = this.props;

    if (this.clearCache) {
      cache = {};
    }

    if (cache[index]) {
      return cache[index];
    }
    let height = 10; //account for spacer
    const row = this.rowData[index];
    if (!row) return 0;
    forEach(
      annotationsToCompute,
      (
        {
          fixedHeight,
          margin = 0,
          isLabel,
          isAlwaysShown,
          annotationHeight,
          computeHeight,
          hasYOffset,
          type
        },
        key,
        i
      ) => {
        const isShown =
          isAlwaysShown ||
          (isLabel
            ? annotationLabelVisibility[type] && annotationVisibility[key]
            : annotationVisibility[key]);
        if (!isShown) return;
        if (fixedHeight) return (height += fixedHeight);
        const annotations = row[type || key];
        if (hasYOffset) {
          let maxYOffset = 0;
          annotations.forEach(a => {
            if (a.yOffset + 1 > maxYOffset) maxYOffset = a.yOffset + 1;
          });
          height += maxYOffset * annotationHeight;
          if (maxYOffset > 0) height += margin;
        }
      }
    );
    cache[index] = height;
    return height;
  };
  getNearestCursorPositionToMouseEvent = (rowData, event, callback) => {
    let { charWidth = defaultCharWidth } = this.props;
    let rowNotFound = true;
    let visibleRowsContainer =
      this.InfiniteScroller && this.InfiniteScroller.items;
    //loop through all the rendered rows to see if the click event lands in one of them
    let nearestCaretPos = 0;
    some(visibleRowsContainer.childNodes, function(rowDomNode) {
      let boundingRowRect = rowDomNode.getBoundingClientRect();
      if (
        event.clientY > boundingRowRect.top &&
        event.clientY < boundingRowRect.top + boundingRowRect.height
      ) {
        //then the click is falls within this row
        rowNotFound = false;
        let row = rowData[Number(rowDomNode.getAttribute("data-row-number"))];
        if (event.clientX - boundingRowRect.left < 0) {
          nearestCaretPos = row.start;
        } else {
          let clickXPositionRelativeToRowContainer =
            event.clientX - boundingRowRect.left;
          let numberOfBPsInFromRowStart = Math.floor(
            (clickXPositionRelativeToRowContainer + charWidth / 2) / charWidth
          );
          nearestCaretPos = numberOfBPsInFromRowStart + row.start;
          if (nearestCaretPos > row.end + 1) {
            nearestCaretPos = row.end + 1;
          }
        }
        return true; //break the loop early because we found the row the click event landed in
      }
    });
    if (rowNotFound) {
      let { top, bottom } = visibleRowsContainer.getBoundingClientRect();
      let numbers = [top, bottom];
      let target = event.clientY;
      let topOrBottom = numbers
        .map(function(value, index) {
          return [Math.abs(value - target), index];
        })
        .sort()
        .map(function(value) {
          return numbers[value[1]];
        })[0];
      let rowDomNode;
      if (topOrBottom === top) {
        rowDomNode = visibleRowsContainer.childNodes[0];
      } else {
        rowDomNode =
          visibleRowsContainer.childNodes[
            visibleRowsContainer.childNodes.length - 1
          ];
      }
      if (rowDomNode) {
        let row = rowData[Number(rowDomNode.getAttribute("data-row-number"))];
        //return the last bp index in the rendered rows
        nearestCaretPos = row.end;
      } else {
        nearestCaretPos = 0;
      }
    }
    callback({
      event,
      className: event.target.className,
      shiftHeld: event.shiftKey,
      nearestCaretPos,
      selectionStartGrabbed: event.target.classList.contains(
        draggableClassnames.selectionStart
      ),
      selectionEndGrabbed: event.target.classList.contains(
        draggableClassnames.selectionEnd
      )
    });
  };

  // componentDidMount() {
  //   this.mounted=true
  // }
  componentWillReceiveProps(props) {
    //we haven't yet called this function yet, so to make sure it jumps to the selected bps we just set a variable on the class
    this.updateScrollPosition(
      this.calledUpdateScrollOnce ? this.props : {},
      props
    );
  }
  updateScrollPosition = (oldProps, newProps) => {
    this.cache = {};
    if (this.dragging === true) {
      return;
    }
    let {
      caretPosition = -1,
      selectionLayer = {},
      matchedSearchLayer = {}
    } = newProps;

    let {
      caretPosition: caretPositionOld = -1,
      selectionLayer: selectionLayerOld = {},
      matchedSearchLayer: matchedSearchLayerOld = {}
    } = oldProps;
    //UPDATE THE ROW VIEW'S POSITION BASED ON CARET OR SELECTION CHANGES
    // let previousBp;
    let scrollToBp = -1;
    if (
      matchedSearchLayer.start > -1 &&
      matchedSearchLayer.start !== matchedSearchLayerOld.start
    ) {
      // previousBp = matchedSearchLayerOld.start;
      scrollToBp = matchedSearchLayer.start;
    } else if (
      matchedSearchLayer.end > -1 &&
      matchedSearchLayer.end !== matchedSearchLayerOld.end
    ) {
      // previousBp = selectionLayerOld.end;
      scrollToBp = matchedSearchLayer.end;
    } else if (caretPosition > -1 && caretPosition !== caretPositionOld) {
      // previousBp = caretPositionOld;
      scrollToBp = caretPosition;
    } else if (
      selectionLayer.start > -1 &&
      selectionLayer.start !== selectionLayerOld.start
    ) {
      // previousBp = selectionLayerOld.start;
      scrollToBp = selectionLayer.start;
    } else if (
      selectionLayer.end > -1 &&
      selectionLayer.end !== selectionLayerOld.end
    ) {
      // previousBp = selectionLayerOld.end;
      scrollToBp = selectionLayer.end;
    }

    let bpsPerRow = getBpsPerRow(newProps);

    if (
      scrollToBp > -1 &&
      this.InfiniteScroller &&
      this.InfiniteScroller.scrollTo
    ) {
      this.calledUpdateScrollOnce = true;
      let rowToScrollTo = Math.floor(scrollToBp / bpsPerRow);
      let [start, end] = this.InfiniteScroller.getVisibleRange();
      // const jumpToBottomOfRow = scrollToBp > previousBp;
      if (rowToScrollTo < start || rowToScrollTo > end) {
        this.InfiniteScroller.scrollTo(rowToScrollTo);
        clearTimeout(this.jumpTimeoutId);
        this.jumpTimeoutId = setTimeout(() => {
          if (!this.InfiniteScroller) return; //this might be undefined if we've already unmounted
          const [el] = this.InfiniteScroller.items.querySelectorAll(
            `[data-row-number="${rowToScrollTo}"]`
          );
          if (!el) {
            //sometimes the el isn't on the page even after the jump because of drawing issues, so we'll try the scroll one more time
            this.InfiniteScroller.scrollTo(rowToScrollTo);
            return;
          }
          //tnr: we can't use the following because it messes up the scroll of the Reflex panels
          //causing the tabs to not be shown
          // el.scrollIntoView && el.scrollIntoView();
        }, 1);
        //   Math.max(rowToScrollTo + (rowToScrollTo < start ? 2 : -2), 0)
        // );
      }
    }
  };

  cache = {};

  render() {
    let {
      //currently found in props
      sequenceData,
      // bpToJumpTo,
      editorDragged,
      editorDragStarted,
      editorClicked,
      backgroundRightClicked,
      editorDragStopped,
      // onScroll,
      width,
      marginWidth,
      height,
      RowItemProps,
      ...rest
    } = this.props;
    if (width === "100%") {
      //we can't render an actual 100% width row view (we need a pixel measurement but we get passed width=100% by react-measure)
      return <div style={{ width, height }} />;
    }
    if (marginWidth < defaultMarginWidth) {
      marginWidth = defaultMarginWidth;
    }
    let containerWidthMinusMargin = width - marginWidth;
    let bpsPerRow = getBpsPerRow(this.props);

    //the width we pass to the rowitem needs to be the exact width of the bps so we need to trim off any extra space:
    // let containerWidthMinusMarginMinusAnyExtraSpaceUpTo1Bp =
    //  propsToUse.charWidth * bpsPerRow;
    let rowData = prepareRowData(sequenceData, bpsPerRow);
    this.rowData = rowData;

    let showJumpButtons = rowData.length > 15;
    let renderItem = index => {
      if (this.cache[index]) return this.cache[index];
      let rowTopComp;
      let rowBottomComp;
      if (showJumpButtons) {
        if (index === 0) {
          rowTopComp = (
            <div>
              <Button
                onClick={e => {
                  e.stopPropagation();
                  this.InfiniteScroller &&
                    this.InfiniteScroller.scrollTo(rowData.length);
                }}
              >
                Jump to end
              </Button>
            </div>
          );
        } else if (index === rowData.length - 1) {
          rowBottomComp = (
            <div>
              <Button
                onClick={e => {
                  e.stopPropagation();
                  this.InfiniteScroller && this.InfiniteScroller.scrollTo(0);
                }}
              >
                Jump to start
              </Button>
            </div>
          );
        }
      }
      if (rowData[index]) {
        let rowItem = (
          <div data-row-number={index} key={index}>
            <div className={"veRowItemSpacer"} />
            <RowItem
              {...{
                ...rest,
                rowTopComp,
                rowBottomComp,
                sequenceLength: sequenceData.sequence.length,
                bpsPerRow,
                fullSequence: sequenceData.sequence,
                ...RowItemProps
              }}
              row={rowData[index]}
            />
          </div>
        );
        this.cache[index] = rowItem;
        return rowItem;
      } else {
        return null;
      }
    };
    const shouldClear = this.shouldClearCache();
    return (
      <Draggable
        bounds={{ top: 0, left: 0, right: 0, bottom: 0 }}
        onDrag={event => {
          this.dragging = true;
          this.getNearestCursorPositionToMouseEvent(
            rowData,
            event,
            editorDragged
          );
        }}
        onStart={event => {
          this.dragging = true;
          this.getNearestCursorPositionToMouseEvent(
            rowData,
            event,
            editorDragStarted
          );
        }}
        onStop={e => {
          this.dragging = false;
          editorDragStopped(e);
        }}
      >
        <div
          tabIndex="0"
          ref={ref => (this.node = ref)}
          className="veRowView"
          style={{
            overflowY: "auto",
            overflowX: "visible",
            height,
            width: containerWidthMinusMargin + marginWidth,
            paddingLeft: marginWidth / 2,
            paddingRight: marginWidth / 2
          }}
          // onScroll={disablePointers} //tnr: this doesn't actually help much with scrolling performance
          onContextMenu={event => {
            this.getNearestCursorPositionToMouseEvent(
              rowData,
              event,
              backgroundRightClicked
            );
          }}
          // onScroll={onScroll}
          onClick={event => {
            this.getNearestCursorPositionToMouseEvent(
              rowData,
              event,
              editorClicked
            );
          }}
        >
          <ReactList
            ref={c => {
              this.InfiniteScroller = c;
              !this.calledUpdateScrollOnce && //trigger the scroll here as well because now we actually have the infinite scroller component accessible
                this.updateScrollPosition({}, this.props);
            }}
            clearCache={shouldClear}
            itemRenderer={renderItem}
            length={rowData.length}
            itemSizeEstimator={this.estimateRowHeight}
            type="variable"
          />
        </div>
      </Draggable>
    );
  }
}

export default withEditorInteractions(RowView);

function getBpsPerRow({
  charWidth = defaultCharWidth,
  width = defaultContainerWidth,
  marginWidth = defaultMarginWidth
}) {
  return Math.floor((width - marginWidth) / charWidth);
}

// function itemSizeEstimator(index, cache) {
//   if (cache[index]) {
//     return cache[index];
//   }
//   return 400;
// }

// const disablePointers = () => {
//   clearTimeout(this.timer);
//   if(!document.body.classList.contains('disable-hover')) {
//     document.body.classList.add('disable-hover')
//   }

//   this.timer = setTimeout(function(){
//     document.body.classList.remove('disable-hover')
//   },0);
// }

function onScroll() {
  window.__veScrolling = true;
  setTimeout(() => {
    window.__veScrolling = false;
  });
}
