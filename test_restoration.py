import subprocess
from pathlib import Path
import pytest

CLI_PATH = Path(__file__).parent / "target" / "release" / "spellcheck-cli"


def restore_text(raw_text: str, mode: str = "document") -> str:
    """Invokes the native spellcheck-cli binary with --restore."""
    binary = CLI_PATH
    if not binary.exists():
        debug_binary = Path(__file__).parent / "target" / "debug" / "spellcheck-cli"
        if debug_binary.exists():
            binary = debug_binary
        else:
            raise FileNotFoundError(f"spellcheck-cli not found at {CLI_PATH}")

    proc = subprocess.run(
        [str(binary), "--restore", "--stdin", "--mode", mode, "--language", "en_GB"],
        input=raw_text,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


TEST_CASES = [
    (
        "TC_BOUNDARIES_01",
        "are you fancying a pint down the pub tonight or shall we organise something at the weekend instead ive travelled all week and cant be arsed to cook",
        "Are you fancying a pint down the pub tonight, or shall we organise something at the weekend instead? I've travelled all week and can't be arsed to cook.",
    ),
    (
        "TC_COMPOUND_01",
        "the team have prioritised the autumn programme but we need to liaise with the centre manager before authorising any additional expenditure",
        "The team have prioritised the autumn programme, but we need to liaise with the centre manager before authorising any additional expenditure.",
    ),
    (
        "TC_PRONOUN_GENITIVE_01",
        "after queuing twenty minutes at the chemists i realised id left my chequebook in the boot of the car right next to the spare tyre",
        "After queuing twenty minutes at the chemist's, I realised I'd left my chequebook in the boot of the car, right next to the spare tyre.",
    ),
    (
        "TC_DIALOGUE_TITLES_01",
        "it takes daily practice to practise law efficiently said dr watson peering at the grey mouldy ledger on his desk",
        '"It takes daily practice to practise law efficiently," said Dr Watson, peering at the grey, mouldy ledger on his desk.',
    ),
    (
        "TC_HOMOGRAPH_DISAMBIGUATION_01",
        "although he had forgotten his id card ill ask whether id better call dr foster because he looks critically ill",
        "Although he had forgotten his ID card, I'll ask whether I'd better call Dr Foster, because he looks critically ill.",
    ),
    (
        "TC_PREPOSITIONAL_GENITIVE_01",
        "three local butchers met outside the chemists to discuss wholesale meat prices while i was waiting at the bakers",
        "Three local butchers met outside the chemist's to discuss wholesale meat prices, while I was waiting at the baker's.",
    ),
    (
        "TC_NESTED_SPEECH_TITLES_01",
        "the witness turned to mrs higgins and said i distinctly heard the driver mutter dont open the boot before the collision explained inspector lestrade",
        "\"The witness turned to Mrs Higgins and said, 'I distinctly heard the driver mutter, \\\"Don't open the boot,\\\" before the collision,'\" explained Inspector Lestrade.",
    ),
    (
        "TC_COMPOUND_INTERROGATIVE_01",
        "the government have delayed the railway programme again but shall we organise an alternative route through the city centre or is the counsel still debating it",
        "The government have delayed the railway programme again, but shall we organise an alternative route through the city centre, or is the counsel still debating it?",
    ),
    (
        "TC_COMPOUND_CARDINALS_01",
        "the contractor quoted thirty five thousand pounds for a job which left the committee short",
        "The contractor quoted thirty-five thousand pounds for a job, which left the committee short.",
    ),
    (
        "TC_BRITISH_TIME_AND_HONORIFICS_01",
        "the conference opens at 930 am on 14 october 2026 but prof higgins will not arrive until 1115 am",
        "The conference opens at 9.30 am on 14 October 2026, but Prof Higgins will not arrive until 11.15 am.",
    ),
    (
        "TC_CHIVALRIC_TITLE_01",
        "we invited sir reginald thorne to inspect the centre yesterday although transport was delayed",
        "We invited Sir Reginald Thorne to inspect the centre yesterday, although transport was delayed.",
    ),
    (
        "TC_BRITISH_TIME_3DIGIT_AND_CARDINALS_01",
        "the coach arrives at 530 pm with sixty four delegates and leaves at 1045 am with ninety nine guests",
        "The coach arrives at 5.30 pm with sixty-four delegates and leaves at 10.45 am with ninety-nine guests.",
    ),
    (
        "TC_GENERALISED_ID_PLURAL_01",
        "all members must present their id cards before entering although exceptions apply",
        "All members must present their ID cards before entering, although exceptions apply.",
    ),
    (
        "TC_INTERIOR_PRONOUNS_ROMAN_01",
        "although i reviewed section i, i’m not sure if i'll need it",
        "Although I reviewed section i, I’m not sure if I'll need it.",
    ),
    (
        "TC_APOSTROPHES_AND_PLURALS_01",
        "the childrens play area was full of 1970's cd's and video's.",
        "The children’s play area was full of 1970s CDs and videos.",
    ),
    (
        "TC_ENDASHES_AND_ADVERBS_01",
        "it was — as far as i could tell — a highly-respected, well formed text.",
        "It was – as far as I could tell – a highly respected, well-formed text.",
    ),
    (
        "TC_QUOTATION_AND_OXFORD_COMMA_01",
        'he said, "i saw fish, shrimp, and krill at land\'s end."',
        "He said, ‘I saw fish, shrimp and krill at Land’s End.’",
    ),
    (
        "TC_POSSESSIVE_VS_CONTRACTION_01",
        "the cat licked it's paws because its muddy.",
        "The cat licked its paws because it’s muddy.",
    ),
]


@pytest.mark.parametrize("test_id, raw_input, expected_output", TEST_CASES)
def test_punctuation_and_capitalisation_restoration(test_id, raw_input, expected_output):
    result = restore_text(raw_input)
    assert result == expected_output, f"Failed on {test_id}:\nExpected: {expected_output}\nReceived: {result}"


# Isolated atomic unit tests for specific targeted edge cases

@pytest.mark.parametrize(
    "raw, expected",
    [
        ("dr watson", "Dr Watson"),
        ("mr smith", "Mr Smith"),
        ("mrs jones", "Mrs Jones"),
        ("prof green", "Prof Green"),
        ("sir reginald", "Sir Reginald"),
        ("prof higgins", "Prof Higgins"),
    ],
)
def test_uk_honorific_casing(raw, expected):
    assert restore_text(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("i think id better go", "I think I'd better go."),
        ("ive seen it and ill do it", "I've seen it and I'll do it."),
    ],
)
def test_isolated_first_person_pronouns_and_contractions(raw, expected):
    assert restore_text(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("down at the butchers", "Down at the butcher's."),
        ("popping into the chemists", "Popping into the chemist's."),
        ("left at the bakers", "Left at the baker's."),
    ],
)
def test_uk_commercial_elliptic_genitives(raw, expected):
    assert restore_text(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("meeting at 530 pm", "Meeting at 5.30 pm."),
        ("departs at 1045 am", "Departs at 10.45 am."),
        ("set alarm for 815am", "Set alarm for 8.15 am."),
    ],
)
def test_british_time_notation_formats(raw, expected):
    assert restore_text(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("sixty four books", "Sixty-four books."),
        ("ninety nine pens", "Ninety-nine pens."),
        ("twenty five pounds", "Twenty-five pounds."),
    ],
)
def test_compound_cardinals_hyphenation(raw, expected):
    assert restore_text(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("i wrote it", "I wrote it"),
        ('he said, "i wrote it yesterday"', 'he said, "I wrote it yesterday"'),
        ("shall i compare thee to a summer's day?", "shall I compare thee to a summer's day?"),
        ("here i am, and here i'll stay.", "here I am, and here I'll stay."),
        ("i think, therefore i am.", "I think, therefore I am."),
        ("(i wrote it)", "(I wrote it)"),
        ("“i wrote it”", "“I wrote it”"),
        ("see section i for details", "see section i for details"),
        ("part i and chapter i", "part i and chapter i"),
        ("phases i to iii", "phases i to iii"),
        ("here i’m waiting and here i’ve been", "here I’m waiting and here I’ve been"),
        ("although i reviewed section i, i’m not sure if i'll need it", "although I reviewed section i, I’m not sure if I'll need it"),
    ],
)
def test_nominative_pronoun_capitalisation(raw, expected):
    assert restore_text(raw, mode="fragment") == expected

