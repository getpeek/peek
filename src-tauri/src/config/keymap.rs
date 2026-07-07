use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Tool {
    Select,
    LassoSelect,
    Query,
    Agent,
    Text,
    Variable,
    Draw,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Edit {
    Cut,
    Copy,
    Paste,
    SelectAll,
    DeleteSelection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum History {
    Undo,
    Redo,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Zoom {
    Reset,
    FitView,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Page {
    New,
    Close,
    Previous,
    Next,
    SelectPreviousQuery,
    SelectNextQuery,
    SelectNodeLeft,
    SelectNodeRight,
    SelectNodeUp,
    SelectNodeDown,
    Search,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum View {
    ToggleUi,
    ToggleCameraLock,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ResultAction {
    Pivot,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Region {
    GroupSelection,
    OpenPicker,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CommandPalette {
    Open,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ConnectionPicker {
    Open,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum AppAction {
    Quit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Help {
    Keymap,
}

/// A user-bindable action. Serializes to / parses from a `"Group::Variant"` string
/// (e.g. `"Tool::Query"`) — the same form used on disk, on the wire, and as the
/// frontend lookup key.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Action {
    Tool(Tool),
    Edit(Edit),
    History(History),
    Zoom(Zoom),
    Page(Page),
    View(View),
    Result(ResultAction),
    Region(Region),
    CommandPalette(CommandPalette),
    ConnectionPicker(ConnectionPicker),
    App(AppAction),
    Help(Help),
}

impl fmt::Display for Action {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let label = match self {
            Action::Tool(Tool::Select) => "Tool::Select",
            Action::Tool(Tool::LassoSelect) => "Tool::LassoSelect",
            Action::Tool(Tool::Query) => "Tool::Query",
            Action::Tool(Tool::Agent) => "Tool::Agent",
            Action::Tool(Tool::Text) => "Tool::Text",
            Action::Tool(Tool::Variable) => "Tool::Variable",
            Action::Tool(Tool::Draw) => "Tool::Draw",
            Action::Edit(Edit::Cut) => "Edit::Cut",
            Action::Edit(Edit::Copy) => "Edit::Copy",
            Action::Edit(Edit::Paste) => "Edit::Paste",
            Action::Edit(Edit::SelectAll) => "Edit::SelectAll",
            Action::Edit(Edit::DeleteSelection) => "Edit::DeleteSelection",
            Action::History(History::Undo) => "History::Undo",
            Action::History(History::Redo) => "History::Redo",
            Action::Zoom(Zoom::Reset) => "Zoom::Reset",
            Action::Zoom(Zoom::FitView) => "Zoom::FitView",
            Action::Page(Page::New) => "Page::New",
            Action::Page(Page::Close) => "Page::Close",
            Action::Page(Page::Previous) => "Page::Previous",
            Action::Page(Page::Next) => "Page::Next",
            Action::Page(Page::SelectPreviousQuery) => "Page::SelectPreviousQuery",
            Action::Page(Page::SelectNextQuery) => "Page::SelectNextQuery",
            Action::Page(Page::SelectNodeLeft) => "Page::SelectNodeLeft",
            Action::Page(Page::SelectNodeRight) => "Page::SelectNodeRight",
            Action::Page(Page::SelectNodeUp) => "Page::SelectNodeUp",
            Action::Page(Page::SelectNodeDown) => "Page::SelectNodeDown",
            Action::Page(Page::Search) => "Page::Search",
            Action::View(View::ToggleUi) => "View::ToggleUi",
            Action::View(View::ToggleCameraLock) => "View::ToggleCameraLock",
            Action::Result(ResultAction::Pivot) => "Result::Pivot",
            Action::Region(Region::GroupSelection) => "Region::GroupSelection",
            Action::Region(Region::OpenPicker) => "Region::OpenPicker",
            Action::CommandPalette(CommandPalette::Open) => "CommandPalette::Open",
            Action::ConnectionPicker(ConnectionPicker::Open) => "ConnectionPicker::Open",
            Action::App(AppAction::Quit) => "App::Quit",
            Action::Help(Help::Keymap) => "Help::Keymap",
        };
        f.write_str(label)
    }
}

impl FromStr for Action {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let action = match value {
            "Tool::Select" => Action::Tool(Tool::Select),
            "Tool::LassoSelect" => Action::Tool(Tool::LassoSelect),
            "Tool::Query" => Action::Tool(Tool::Query),
            "Tool::Agent" => Action::Tool(Tool::Agent),
            "Tool::Text" => Action::Tool(Tool::Text),
            "Tool::Variable" => Action::Tool(Tool::Variable),
            "Tool::Draw" => Action::Tool(Tool::Draw),
            "Edit::Cut" => Action::Edit(Edit::Cut),
            "Edit::Copy" => Action::Edit(Edit::Copy),
            "Edit::Paste" => Action::Edit(Edit::Paste),
            "Edit::SelectAll" => Action::Edit(Edit::SelectAll),
            "Edit::DeleteSelection" => Action::Edit(Edit::DeleteSelection),
            "History::Undo" => Action::History(History::Undo),
            "History::Redo" => Action::History(History::Redo),
            "Zoom::Reset" => Action::Zoom(Zoom::Reset),
            "Zoom::FitView" => Action::Zoom(Zoom::FitView),
            "Page::New" => Action::Page(Page::New),
            "Page::Close" => Action::Page(Page::Close),
            "Page::Previous" => Action::Page(Page::Previous),
            "Page::Next" => Action::Page(Page::Next),
            "Page::SelectPreviousQuery" => Action::Page(Page::SelectPreviousQuery),
            "Page::SelectNextQuery" => Action::Page(Page::SelectNextQuery),
            "Page::SelectNodeLeft" => Action::Page(Page::SelectNodeLeft),
            "Page::SelectNodeRight" => Action::Page(Page::SelectNodeRight),
            "Page::SelectNodeUp" => Action::Page(Page::SelectNodeUp),
            "Page::SelectNodeDown" => Action::Page(Page::SelectNodeDown),
            "Page::Search" => Action::Page(Page::Search),
            "View::ToggleUi" => Action::View(View::ToggleUi),
            "View::ToggleCameraLock" => Action::View(View::ToggleCameraLock),
            "Result::Pivot" => Action::Result(ResultAction::Pivot),
            "Region::GroupSelection" => Action::Region(Region::GroupSelection),
            "Region::OpenPicker" => Action::Region(Region::OpenPicker),
            "CommandPalette::Open" => Action::CommandPalette(CommandPalette::Open),
            "ConnectionPicker::Open" => Action::ConnectionPicker(ConnectionPicker::Open),
            "App::Quit" => Action::App(AppAction::Quit),
            "Help::Keymap" => Action::Help(Help::Keymap),
            other => return Err(format!("unknown keymap action: {other}")),
        };
        Ok(action)
    }
}

/// The built-in keyboard shortcuts, as `(key, action)` pairs. Users override individual
/// keys in `settings.json`; everything they omit keeps the binding here. A single action
/// may appear under more than one key (the command palette opens on both `meta-p` and
/// `meta-shift-p`).
#[must_use]
pub(crate) fn default_keymap() -> Vec<(&'static str, Action)> {
    vec![
        ("escape", Action::Tool(Tool::Select)),
        ("l", Action::Tool(Tool::LassoSelect)),
        ("q", Action::Tool(Tool::Query)),
        ("a", Action::Tool(Tool::Agent)),
        ("t", Action::Tool(Tool::Text)),
        ("v", Action::Tool(Tool::Variable)),
        ("d", Action::Tool(Tool::Draw)),
        ("meta-x", Action::Edit(Edit::Cut)),
        ("meta-c", Action::Edit(Edit::Copy)),
        ("meta-v", Action::Edit(Edit::Paste)),
        ("meta-a", Action::Edit(Edit::SelectAll)),
        ("backspace", Action::Edit(Edit::DeleteSelection)),
        ("meta-z", Action::History(History::Undo)),
        ("shift-meta-z", Action::History(History::Redo)),
        ("meta-0", Action::Zoom(Zoom::Reset)),
        ("meta-shift-0", Action::Zoom(Zoom::FitView)),
        ("meta-t", Action::Page(Page::New)),
        ("meta-w", Action::Page(Page::Close)),
        ("meta-shift-[", Action::Page(Page::Previous)),
        ("meta-shift-]", Action::Page(Page::Next)),
        ("meta-[", Action::Page(Page::SelectPreviousQuery)),
        ("meta-]", Action::Page(Page::SelectNextQuery)),
        ("meta-arrowleft", Action::Page(Page::SelectNodeLeft)),
        ("meta-arrowright", Action::Page(Page::SelectNodeRight)),
        ("meta-arrowup", Action::Page(Page::SelectNodeUp)),
        ("meta-arrowdown", Action::Page(Page::SelectNodeDown)),
        ("meta-.", Action::View(View::ToggleUi)),
        ("meta-shift-l", Action::View(View::ToggleCameraLock)),
        ("shift-p", Action::Result(ResultAction::Pivot)),
        ("meta-g", Action::Region(Region::GroupSelection)),
        ("r", Action::Region(Region::OpenPicker)),
        ("meta-f", Action::Page(Page::Search)),
        ("meta-p", Action::CommandPalette(CommandPalette::Open)),
        ("meta-shift-p", Action::CommandPalette(CommandPalette::Open)),
        ("p", Action::ConnectionPicker(ConnectionPicker::Open)),
        ("meta-q", Action::App(AppAction::Quit)),
        ("meta-/", Action::Help(Help::Keymap)),
    ]
}
