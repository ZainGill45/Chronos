using UnityEngine.EventSystems;
using UnityEngine.UI;
using UnityEngine;

public class NavigationBar : MonoBehaviour
{
    [field: Header("General Dependencies")]
    [field: SerializeField] private Sprite homeSelectedIcon;
    [field: SerializeField] private Sprite homeUnselectedIcon;
    [field: SerializeField] private Sprite statisticsSelectedIcon;
    [field: SerializeField] private Sprite statisticsUnselectedIcon;
    [field: SerializeField] private Sprite settingsSelectedIcon;
    [field: SerializeField] private Sprite settingsUnselectedIcon;

    [field: Header("Panel Dependencies")]
    [field: SerializeField] private Transform homePage;
    [field: SerializeField] private Transform statisticsPage;
    [field: SerializeField] private Transform settingsPage;

    [field: Header("Image Dependencies")]
    [field: SerializeField] private Image homeImage;
    [field: SerializeField] private Image statisticsImage;
    [field: SerializeField] private Image settingsImage;

    [field: Header("Button Dependencies")]
    [field: SerializeField] private EventTrigger homeTrigger;
    [field: SerializeField] private EventTrigger statisticsTrigger;
    [field: SerializeField] private EventTrigger settingsTrigger;

    private void Start()
    {
        EnableHomePage();

        EventTrigger.Entry homeEntry = new EventTrigger.Entry
        {
            eventID = EventTriggerType.PointerDown
        };
        homeEntry.callback.AddListener((eventData) => { EnableHomePage(); });
        homeTrigger.triggers.Add(homeEntry);

        EventTrigger.Entry statisticsEntry = new EventTrigger.Entry
        {
            eventID = EventTriggerType.PointerDown
        };
        statisticsEntry.callback.AddListener((eventData) => { EnableStatisticsPage(); });
        statisticsTrigger.triggers.Add(statisticsEntry);

        EventTrigger.Entry settingsEntry = new EventTrigger.Entry
        {
            eventID = EventTriggerType.PointerDown
        };
        settingsEntry.callback.AddListener((eventData) => { EnableSettingsPage(); });
        settingsTrigger.triggers.Add(settingsEntry);
    }

    private void EnableHomePage()
    {
        homeImage.sprite = homeSelectedIcon;
        statisticsImage.sprite = statisticsUnselectedIcon;
        settingsImage.sprite = settingsUnselectedIcon;

        homePage.gameObject.SetActive(true);
        statisticsPage.gameObject.SetActive(false);
        settingsPage.gameObject.SetActive(false);
    }
    private void EnableStatisticsPage()
    {
        homeImage.sprite = homeUnselectedIcon;
        statisticsImage.sprite = statisticsSelectedIcon;
        settingsImage.sprite = settingsUnselectedIcon;

        homePage.gameObject.SetActive(false);
        statisticsPage.gameObject.SetActive(true);
        settingsPage.gameObject.SetActive(false);
    }
    private void EnableSettingsPage()
    {
        homeImage.sprite = homeUnselectedIcon;
        statisticsImage.sprite = statisticsUnselectedIcon;
        settingsImage.sprite = settingsSelectedIcon;

        homePage.gameObject.SetActive(false);
        statisticsPage.gameObject.SetActive(false);
        settingsPage.gameObject.SetActive(true);
    }
}
