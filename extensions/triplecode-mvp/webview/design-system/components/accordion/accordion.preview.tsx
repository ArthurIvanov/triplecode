import { ActionButton, ActionButtonIcon } from '../action-button';
import { Accordion, type AccordionSize, type AccordionState } from '.';

function icon(media: string, name: string, dimension = 16) {
  return <ActionButtonIcon href={`${media}/figma-assets/${name}`} dimension={dimension} />;
}

const sampleBody = (
  <>
    <p>Nested content aligned under the title, with a vertical line that grows with the block height.</p>
    <p>Second paragraph so the line is visibly taller.</p>
  </>
);

export function AccordionPreview({ media = '' }: { media?: string }) {
  const sizes: AccordionSize[] = ['base', 'small'];
  const states: AccordionState[] = ['enabled', 'hover', 'focus', 'disabled'];

  return (
    <div className="accordion-preview">
      <div className="accordion-preview__row">
        <Accordion title="Expanded item" defaultExpanded>{sampleBody}</Accordion>
        <Accordion title="Collapsed item" />
        <Accordion title="Disabled expanded" disabled defaultExpanded>
          <p>Disabled header does not react; content stays visible.</p>
        </Accordion>
      </div>

      <div className="accordion-preview__row">
        {sizes.map(size => (
          <Accordion key={size} title={`${size} expanded`} size={size} defaultExpanded>
            <p>{size} size content.</p>
          </Accordion>
        ))}
        {sizes.map(size => (
          <Accordion key={`${size}-collapsed`} title={`${size} collapsed`} size={size} />
        ))}
      </div>

      <div className="accordion-preview__row">
        <Accordion
          title="With slots"
          defaultExpanded
          end={icon(media, 'imgFolder.svg')}
          actions={
            <ActionButton
              size="small"
              variant="ghost"
              rounding="full"
              text={null}
              aria-label="Item actions"
              start={icon(media, 'imgX.svg', 14)}
            />
          }
        >
          <p>End slot 32×24, actions 24×24. Clicking the actions button does not toggle.</p>
        </Accordion>
        <Accordion title="Bordered (unverified)" border defaultExpanded>
          <p>border=true has no Figma variant yet — styling is provisional.</p>
        </Accordion>
      </div>

      <div className="accordion-preview__row">
        {states.map(state => (
          <Accordion key={state} title={`State: ${state}`} state={state} defaultExpanded={state !== 'disabled'}>
            <p>Forced gallery state.</p>
          </Accordion>
        ))}
      </div>
    </div>
  );
}
